import { afterEach, expect, test, vi } from "vitest";
import prisma, { setPrismaClient } from "@/lib/prisma";
import {
  findKitchenItems,
  takePendingOrderItem,
  markPreparingOrderItemReady,
} from "../db_repository";
import type { UserRole } from "@/authorization/types";

const originalPrisma = prisma();
afterEach(() => setPrismaClient(originalPrisma));

test.each([
  ["KITCHEN", { preparationStation: "KITCHEN" }],
  ["BARTENDER", { preparationStation: "BAR" }],
  ["ADMIN", {}],
  ["WAITER", { id: { in: [] } }],
  [undefined, { id: { in: [] } }],
] as const)(
  "restricts both queries and conditional writes for %s",
  async (role, filter) => {
    const findMany = vi.fn().mockResolvedValue([]);
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    setPrismaClient({ orderItem: { findMany, updateMany } } as never);
    await findKitchenItems("company-1", role as UserRole);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ...filter,
          order: expect.objectContaining({ companyId: "company-1" }),
        }),
      }),
    );
    for (const transition of [
      takePendingOrderItem,
      markPreparingOrderItemReady,
    ]) {
      const result = await transition({
        orderItemId: "foreign-item",
        companyId: "company-1",
        userId: "operator",
        role: role as UserRole,
      });
      expect(result.success).toBe(false);
      expect(updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "foreign-item",
            AND: filter,
            order: expect.objectContaining({ companyId: "company-1" }),
          }),
        }),
      );
    }
  },
);

test("returns the historical line station, including unconfigured items", async () => {
  const findMany = vi.fn().mockResolvedValue(
    ["KITCHEN", "BAR", null].map((preparationStation, id) => ({
      id: String(id),
      preparationStation,
      quantity: 1,
      kitchenStatus: "PENDING",
      product: { name: "Producto", preparationStation: "BAR" },
      order: { tableSession: { table: { number: 1 } } },
    })),
  );
  setPrismaClient({ orderItem: { findMany } } as never);
  const result = await findKitchenItems("company-1", "ADMIN");
  expect(
    result.success && result.data.map((item) => item.preparationStation),
  ).toEqual(["KITCHEN", "BAR", null]);
});
