import { Prisma, type PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, test, vi } from "vitest";
import prisma, { setPrismaClient } from "@/lib/prisma";
import {
  countCashShifts,
  findOrderItems,
  getManyCashShifts,
  prismaCashShiftToCashShift,
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
              where: { quantity: { gt: 0 } },
              include: { product: true },
            },
          },
        },
      },
    });
  });
});

describe("prismaCashShiftToCashShift", () => {
  test("includes paid non-cancelled orders in every cash total", async () => {
    const orders = [
      { id: "completed", status: "COMPLETED", total: 100 },
      { id: "pending", status: "PENDING", total: 50 },
      { id: "cancelled", status: "CANCELLED", total: 75 },
    ].map((order) => ({
      ...order,
      paymentStatus: "PAID",
      discountAmount: new Prisma.Decimal(0),
      netTotal: new Prisma.Decimal(order.total),
      total: new Prisma.Decimal(order.total),
      documentType: null,
      companyId: "company-1",
      cashShiftId: "shift-1",
      customerId: null,
      sellerId: null,
      cancellationReason: null,
      orderType: "RETAIL",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    }));
    const payments = [
      { orderId: "completed", method: "CASH", amount: 100 },
      { orderId: "pending", method: "DEBIT_CARD", amount: 50 },
      { orderId: "cancelled", method: "CREDIT_CARD", amount: 75 },
    ].map((payment, index) => ({
      ...payment,
      id: `payment-${index}`,
      cashShiftId: "shift-1",
      data: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      amount: new Prisma.Decimal(payment.amount),
    }));

    setPrismaClient({
      user: { findUnique: vi.fn().mockResolvedValue({ name: "Cashier" }) },
      orderItem: { findMany: vi.fn().mockResolvedValue([]) },
      payment: { findMany: vi.fn().mockResolvedValue([]) },
      product: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient);

    const cashShift = await prismaCashShiftToCashShift({
      id: "shift-1",
      userId: "user-1",
      companyId: "company-1",
      openedAt: new Date("2026-01-01"),
      initialAmount: new Prisma.Decimal(25),
      finalAmount: null,
      status: "OPEN",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      orders,
      payments,
      expenses: [],
    });

    expect(cashShift.totalSales).toBe(150);
    expect(cashShift.amountInCashRegister).toBe(175);
    expect(cashShift.totalCashSales).toBe(100);
    expect(cashShift.totalDebitCardSales).toBe(50);
    expect(cashShift.totalCreditCardSales).toBe(0);
    expect(cashShift.totalWalletSales).toBe(0);
  });
});
