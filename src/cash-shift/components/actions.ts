"use server";

import { OpenCashShift, ClosedCashShift } from "@/cash-shift/types";
import cashShiftCreator from "@/cash-shift/use-cases/cash-shift-creator";
import * as repository from "@/cash-shift/db_repository";
import { response } from "@/lib/types";

export const createCashShift = async (
  userId: string,
  initialAmount: number,
): Promise<response<OpenCashShift>> => {
  const userResponse = await repository.userByEmail(userId);
  if (!userResponse.success) {
    return {
      success: false,
      message: "Usuario no existe",
      type: "AuthError",
    };
  }

  const cashShift: OpenCashShift = {
    id: crypto.randomUUID(),
    userId: userResponse.data.id,
    companyId: userResponse.data.companyId,
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

export const closeCashShift = async (
  cashShift: OpenCashShift,
  finalAmount: number,
): Promise<response<ClosedCashShift>> => {
  const closedCashShift: ClosedCashShift = {
    ...cashShift,
    status: "closed",
    finalAmount: finalAmount,
    closedAt: new Date(),
  };

  const response = await repository.saveCashShift(closedCashShift);
  if (!response.success) {
    return {
      success: false,
      message: "No se pudo cerrar caja, comuniquese con soporte",
    };
  }

  return response;
};
