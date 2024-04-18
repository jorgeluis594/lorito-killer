import prisma from "@/lib/prisma";
import {
  $Enums,
  CashShift as PrismaCashSift,
  Order,
  Payment,
  Prisma,
  ShiftStatus,
} from "@prisma/client";
import type { OpenCashShift, CashShiftWithOutOrders, CashShift } from "./types";
import { response } from "@/lib/types";
import {
  mapPrismaPaymentToPayment,
  transformOrdersData,
} from "@/order/db_repository";
import PaymentMethod = $Enums.PaymentMethod;

const cashShiftMapper: { open: "OPEN"; closed: "CLOSED" } = {
  open: "OPEN",
  closed: "CLOSED",
};

const cashShiftStatusToPrisma = (status: CashShift["status"]): ShiftStatus =>
  cashShiftMapper[status];

const cashShiftToPrisma = (
  cashShift: CashShift,
): Omit<PrismaCashSift, "createdAt" | "updatedAt"> => ({
  id: cashShift.id,
  userId: cashShift.userId,
  openedAt: cashShift.openedAt,
  initialAmount: new Prisma.Decimal(cashShift.initialAmount),
  finalAmount:
    cashShift.status == "open"
      ? null
      : new Prisma.Decimal(cashShift.finalAmount),
  status: cashShiftStatusToPrisma(cashShift.status),
  closedAt: cashShift.status == "open" ? null : cashShift.closedAt,
});

export const createCashShift = async <T extends CashShift>(
  cashShift: T,
): Promise<response<T>> => {
  try {
    const persistedCashShift = await prisma.cashShift.create({
      data: cashShiftToPrisma(cashShift),
      include: { orders: true, payments: true },
    });

    return {
      success: true,
      data: await prismaCashShiftToCashShift<T>(persistedCashShift),
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getManyCashShifts = async (
  userId: string,
): Promise<response<CashShiftWithOutOrders[]>> => {
  const cashShifts = await prisma.cashShift.findMany({
    where: { userId },
    orderBy: { openedAt: "desc" },
  });

  return {
    success: true,
    data: cashShifts.map((prismaCashShift) => ({
      ...prismaCashShift,
      status: prismaCashShift.status == "OPEN" ? "open" : "closed",
      initialAmount: Number(prismaCashShift.initialAmount),
      finalAmount: prismaCashShift.finalAmount
        ? Number(prismaCashShift.finalAmount)
        : undefined,
    })),
  };
};

export const getLastOpenCashShift = async (
  userId: string,
): Promise<response<OpenCashShift>> => {
  const cashShift = await prisma.cashShift.findFirst({
    where: {
      userId,
      status: "OPEN",
    },
    orderBy: { openedAt: "desc" },
    include: { orders: true, payments: true },
  });

  if (!cashShift) {
    return { success: false, message: "No se encontró ninguna caja abierta" };
  }

  return {
    success: true,
    data: await prismaCashShiftToCashShift<OpenCashShift>(cashShift),
  };
};

function sumPaymentsAmount(
  payments: Payment[],
  filter: PaymentMethod | null = null,
): number {
  return payments
    .filter((payment) => (!!filter ? payment.method === filter : true))
    .reduce((acc, payment) => acc + Number(payment.amount), 0);
}

export const prismaCashShiftToCashShift = async <T extends CashShift>(
  prismaCashShift: PrismaCashSift & { orders: Order[]; payments: Payment[] },
): Promise<T> => {
  const baseCashShift = {
    id: prismaCashShift.id,
    userId: prismaCashShift.userId,
    initialAmount: Number(prismaCashShift.initialAmount),
    openedAt: prismaCashShift.openedAt,
    totalSales: sumPaymentsAmount(prismaCashShift.payments),
    totalCashSales: sumPaymentsAmount(prismaCashShift.payments || [], "CASH"),
    totalDebitCardSales: sumPaymentsAmount(
      prismaCashShift.payments || [],
      "DEBIT_CARD",
    ),
    totalCreditCardSales: sumPaymentsAmount(
      prismaCashShift.payments || [],
      "CREDIT_CARD",
    ),
    totalWalletSales: sumPaymentsAmount(
      prismaCashShift.payments || [],
      "WALLET",
    ),
    orders: await transformOrdersData(prismaCashShift.orders || []),
    payments: (prismaCashShift.payments || []).map(mapPrismaPaymentToPayment),
  };

  if (prismaCashShift.status === "OPEN") {
    return {
      ...baseCashShift,
      status: "open",
    } as T;
  } else {
    return {
      ...baseCashShift,
      status: "closed",
      finalAmount: Number(prismaCashShift.finalAmount),
      closedAt: prismaCashShift.closedAt!,
    } as T;
  }
};
