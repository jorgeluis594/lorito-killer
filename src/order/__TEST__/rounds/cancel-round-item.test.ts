import { afterEach, describe, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import prisma, { setPrismaClient } from "@/lib/prisma";
import { CancelRoundItemSchema } from "../../rounds/schema";
import { persistRoundItemCancellation } from "../../rounds/db_repository";

const originalPrisma = prisma();
afterEach(() => setPrismaClient(originalPrisma));

const input = {
  cancellationId: "8af33190-f5de-4a36-af82-dae9db1bc732",
  orderRoundItemId: "8af33190-f5de-4a36-af82-dae9db1bc733",
  quantity: 1,
  reason: "",
  companyId: "company-1",
  userId: "waiter-1",
  isAdmin: false,
};

describe("cancelRoundItem", () => {
  test("accepts a positive quantity and an empty reason", () => {
    expect(CancelRoundItemSchema.safeParse(input).success).toBe(true);
    expect(
      CancelRoundItemSchema.safeParse({ ...input, quantity: 0 }).success,
    ).toBe(false);
  });

  test("reduces the exact line, keeps the round quantity and records history", async () => {
    const updateItem = vi.fn().mockResolvedValue({});
    const createCancellation = vi.fn().mockResolvedValue({
      id: input.cancellationId,
      orderRoundItemId: input.orderRoundItemId,
      quantity: new Prisma.Decimal(1),
      reason: null,
    });
    const item = {
      id: input.orderRoundItemId,
      orderItemId: "item-1",
      quantity: new Prisma.Decimal(3),
      cancellations: [],
      orderItem: {
        quantity: new Prisma.Decimal(3),
        productPrice: new Prisma.Decimal(25),
        discountType: null,
        discountValue: null,
      },
      orderRound: {
        orderId: "order-1",
        responsibleUserId: input.userId,
        order: {
          companyId: input.companyId,
          status: "PENDING",
          paymentStatus: "PENDING",
        },
      },
    };
    const tx = {
      $queryRaw: vi.fn(),
      orderItemCancellation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: createCancellation,
      },
      orderRoundItem: {
        findFirst: vi.fn().mockResolvedValue(item),
        findUnique: vi.fn().mockResolvedValue(item),
      },
      orderItem: {
        update: updateItem,
        aggregate: vi.fn().mockResolvedValue({
          _sum: { total: 50, netTotal: 50, discountAmount: 0 },
        }),
      },
      order: { update: vi.fn() },
    };
    setPrismaClient({
      $transaction: (callback: (db: typeof tx) => unknown) => callback(tx),
    } as never);

    expect((await persistRoundItemCancellation(input)).success).toBe(true);
    expect(updateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: new Prisma.Decimal(2),
          total: new Prisma.Decimal(50),
        }),
      }),
    );
    expect(createCancellation).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: null,
        quantity: new Prisma.Decimal(1),
      }),
    });
  });
});
