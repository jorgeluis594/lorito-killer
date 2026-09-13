import { afterEach, describe, expect, test, vi } from "vitest";
import prisma, { setPrismaClient } from "@/lib/prisma";
import { countReadyRounds } from "@/table/use-cases/count-ready-rounds";
import {
  markPreparingOrderItemReady,
  serveReadyRound,
} from "../db_repository";

const originalPrisma = prisma();

afterEach(() => setPrismaClient(originalPrisma));

describe("countReadyRounds", () => {
  test("counts only rounds whose active products are all ready", () => {
    expect(
      countReadyRounds([
        { round: 1, kitchenStatus: "READY" },
        { round: 1, kitchenStatus: "CANCELLED" },
        { round: 2, kitchenStatus: "READY" },
        { round: 2, kitchenStatus: "PREPARING" },
        { round: 3, kitchenStatus: "SERVED" },
      ]),
    ).toBe(1);
  });
});

describe("markPreparingOrderItemReady", () => {
  test("uses a tenant-scoped conditional PREPARING to READY transition", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    setPrismaClient({ orderItem: { updateMany } } as never);

    const result = await markPreparingOrderItemReady({
      orderItemId: "item-1",
      companyId: "company-1",
      userId: "cook-1",
      role: "KITCHEN",
    });

    expect(result.success).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "item-1",
          kitchenStatus: "PREPARING",
          order: expect.objectContaining({ companyId: "company-1" }),
        }),
        data: expect.objectContaining({
          kitchenStatus: "READY",
          kitchenReadyById: "cook-1",
        }),
      }),
    );
  });
});

describe("serveReadyRound", () => {
  test("marks every ready product in one round served with audit data", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const tx = {
      order: {
        findFirst: vi.fn().mockResolvedValue({
          id: "order-1",
          orderItems: [
            { kitchenStatus: "READY" },
            { kitchenStatus: "READY" },
          ],
        }),
      },
      orderItem: { updateMany },
    };
    setPrismaClient({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);

    const result = await serveReadyRound({
      tableId: "table-1",
      round: 2,
      companyId: "company-1",
      userId: "waiter-1",
    });

    expect(result.success).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-1", round: 2, kitchenStatus: "READY" },
      data: {
        kitchenStatus: "SERVED",
        servedAt: expect.any(Date),
        servedById: "waiter-1",
      },
    });
  });

  test("rejects a round that still has a product in preparation", async () => {
    const updateMany = vi.fn();
    const tx = {
      order: {
        findFirst: vi.fn().mockResolvedValue({
          id: "order-1",
          orderItems: [
            { kitchenStatus: "READY" },
            { kitchenStatus: "PREPARING" },
          ],
        }),
      },
      orderItem: { updateMany },
    };
    setPrismaClient({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);

    const result = await serveReadyRound({
      tableId: "table-1",
      round: 2,
      companyId: "company-1",
      userId: "waiter-1",
    });

    expect(result).toEqual({
      success: false,
      message: "Solo una comanda lista puede marcarse servida",
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  test("rejects the concurrent loser without writing a second audit", async () => {
    const tx = {
      order: {
        findFirst: vi.fn().mockResolvedValue({
          id: "order-1",
          orderItems: [{ kitchenStatus: "READY" }],
        }),
      },
      orderItem: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    setPrismaClient({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);

    const result = await serveReadyRound({
      tableId: "table-1",
      round: 2,
      companyId: "company-1",
      userId: "waiter-2",
    });

    expect(result).toEqual({
      success: false,
      message: "La comanda ya fue servida",
    });
  });
});
