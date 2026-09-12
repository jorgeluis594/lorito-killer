import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, test, vi } from "vitest";
import prisma, { setPrismaClient } from "@/lib/prisma";
import {
  countCashShifts,
  findOrderItems,
  getManyCashShifts,
} from "@/cash-shift/db_repository";

const originalPrisma = prisma();

afterEach(() => setPrismaClient(originalPrisma));

describe("cash shift pagination", () => {
  test("filters, orders and paginates cash shifts by company", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(11);
    setPrismaClient({
      cashShift: { findMany, count },
      user: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient);

    await getManyCashShifts("company-1", { page: 2, pageSize: 10 });
    await countCashShifts("company-1");

    expect(findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      include: { orders: true, expenses: true },
      orderBy: { openedAt: "desc" },
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
    });
  });
});

describe("findOrderItems", () => {
  test("excludes cancelled order items", async () => {
    const findUnique = vi.fn().mockResolvedValue({ orders: [] });
    setPrismaClient({
      cashShift: { findUnique },
    } as unknown as PrismaClient);

    await findOrderItems("cash-shift-1");

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "cash-shift-1" },
      include: {
        orders: {
          include: {
            orderItems: {
              where: { kitchenStatus: { not: "CANCELLED" } },
              include: { product: true },
            },
          },
        },
      },
    });
  });
});
