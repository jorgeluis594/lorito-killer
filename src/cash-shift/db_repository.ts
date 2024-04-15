import prisma from "@/lib/prisma";
import {
  $Enums,
  CashShift as PrismaCashSift,
  Order,
  Payment,
  Prisma,
  ShiftStatus,
} from "@prisma/client";
import type { CashShift, OpenCashShift } from "./types";
import { response } from "@/lib/types";
import {
  mapPrismaPaymentToPayment,
  transformOrderData,
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
    await prisma.cashShift.create({
      data: cashShiftToPrisma(cashShift),
    });

    return { success: true, data: structuredClone(cashShift) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
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
    data: prismaCashShiftToCashShift(cashShift) as OpenCashShift,
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

export const prismaCashShiftToCashShift = (
  prismaCashShift: PrismaCashSift & { orders: Order[]; payments: Payment[] },
): CashShift => {
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
    orders: (prismaCashShift.orders || []).map(transformOrderData),
    payments: (prismaCashShift.payments || []).map(mapPrismaPaymentToPayment),
  };

  if (prismaCashShift.status === "OPEN") {
    return {
      ...baseCashShift,
      status: "open",
    };
  } else {
    return {
      ...baseCashShift,
      status: "closed",
      finalAmount: Number(prismaCashShift.finalAmount),
      closedAt: prismaCashShift.closedAt!,
    };
  }
};
