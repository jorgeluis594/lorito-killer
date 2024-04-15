import prisma from "@/lib/prisma";
import {
  CashShift as PrismaCashSift,
  Prisma,
  ShiftStatus,
} from "@prisma/client";
import type { CashShift, CashShiftResponse } from "./types";

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

export const createCashShift = async (
  cashShift: CashShift,
): Promise<CashShiftResponse> => {
  try {
    await prisma.cashShift.create({
      data: cashShiftToPrisma(cashShift),
    });

    return { success: true, data: structuredClone(cashShift) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
