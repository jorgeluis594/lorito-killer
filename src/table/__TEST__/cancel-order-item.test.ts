import { afterEach, describe, expect, test, vi } from "vitest";
import prisma, { setPrismaClient } from "@/lib/prisma";
import { cancelPendingOrderItem } from "../db_repository";
import { cancelOrderItem } from "../use-cases/cancel-order-item";

const originalPrisma = prisma();

afterEach(() => setPrismaClient(originalPrisma));

const input = {
  orderItemId: "item-1",
  companyId: "company-1",
  userId: "user-1",
  reason: "  Error de pedido  ",
};

describe("cancelOrderItem", () => {
  test("trims the reason and delegates the atomic pending-item cancellation", async () => {
    const cancelPending = vi
      .fn()
      .mockResolvedValue({ success: true, data: undefined });

    const result = await cancelOrderItem(input, cancelPending);

    expect(result.success).toBe(true);
    expect(cancelPending).toHaveBeenCalledWith({
      ...input,
      reason: "Error de pedido",
    });
  });

  test("rejects an empty reason without writing", async () => {
    const cancelPending = vi.fn();

    const result = await cancelOrderItem(
      { ...input, reason: "   " },
      cancelPending,
    );

    expect(result).toEqual({
      success: false,
      message: "El motivo de cancelacion es requerido",
    });
    expect(cancelPending).not.toHaveBeenCalled();
  });

  test("preserves the repository rejection when Cocina already took the item", async () => {
    const cancelPending = vi.fn().mockResolvedValue({
      success: false,
      message: "El producto ya fue tomado por cocina o cancelado",
    });

    const result = await cancelOrderItem(input, cancelPending);

    expect(result).toEqual({
      success: false,
      message: "El producto ya fue tomado por cocina o cancelado",
    });
  });
});

describe("cancelPendingOrderItem", () => {
  test("atomically cancels only a pending item from the active company order", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const updateOrder = vi.fn().mockResolvedValue({});
    const tx = {
      $queryRaw: vi.fn(),
      orderItem: {
        updateMany,
        findUnique: vi.fn().mockResolvedValue({ orderId: "order-1" }),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { total: 20, netTotal: 20 },
        }),
      },
      order: { update: updateOrder },
    };
    setPrismaClient({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);

    const result = await cancelPendingOrderItem({
      orderItemId: "item-1",
      companyId: "company-1",
      userId: "user-1",
      reason: "Error de pedido",
    });

    expect(result.success).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "item-1",
          kitchenStatus: "PENDING",
          order: {
            companyId: "company-1",
            status: "PENDING",
            tableSession: { current: true, status: "OPEN" },
          },
        }),
      }),
    );
    expect(updateOrder).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { total: 20, netTotal: 20 },
    });
  });

  test("does not recalculate twice when a concurrent cancellation loses", async () => {
    const updateOrder = vi.fn();
    const tx = {
      $queryRaw: vi.fn(),
      orderItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn(),
        aggregate: vi.fn(),
      },
      order: { update: updateOrder },
    };
    setPrismaClient({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);

    const result = await cancelPendingOrderItem({
      orderItemId: "item-1",
      companyId: "company-1",
      userId: "user-1",
      reason: "Error de pedido",
    });

    expect(result).toEqual({
      success: false,
      message: "El producto ya fue tomado por cocina o cancelado",
    });
    expect(updateOrder).not.toHaveBeenCalled();
  });
});
