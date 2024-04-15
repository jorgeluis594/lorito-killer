"use server";

import { OpenCashShift } from "@/cash-shift/types";
import cashShiftCreator from "@/cash-shift/use-cases/cash-shift-creator";
import { response } from "@/lib/types";

export const createCashShift = async (
  userId: string,
  initialAmount: number,
): Promise<response<OpenCashShift>> => {
  const cashShift: OpenCashShift = {
    id: crypto.randomUUID(),
    userId: userId,
    initialAmount: initialAmount,
    totalSales: 0,
    totalCashSales: 0,
    totalDebitCardSales: 0,
    totalCreditCardSales: 0,
    totalWalletSales: 0,
    orders: [],
    payments: [],
    status: "open",
    openedAt: new Date(),
  };

  return await cashShiftCreator(cashShift);
};
