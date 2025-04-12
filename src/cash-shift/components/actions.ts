"use server";

import {OpenCashShift, ClosedCashShift, Expense, GrossProfit} from "@/cash-shift/types";
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
    userName: userResponse.data.name || "Usuario sin nombre",
    initialAmount: initialAmount,
    amountInCashRegister: initialAmount,
    totalSales: 0,
    totalCashSales: 0,
    totalDebitCardSales: 0,
    totalCreditCardSales: 0,
    totalWalletSales: 0,
    orders: [],
    payments: [],
    expenses: [],
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

export const addExpense = async (
  expense: Expense,
): Promise<response<Expense>> => {
  return await repository.addExpense(expense);
};

export const findUtility = async (
  id: string,
): Promise<response<GrossProfit>> => {
  const ordersResponse = await repository.findOrders(id);

  if(!ordersResponse.success) {
    throw new Error("Order items not found");
  }

  const totalDifferenceSum = ordersResponse.data.reduce((acc, item) => {
    return acc + item.totalDiference;
  }, 0);

  const grossProfit: GrossProfit = {
    utility: totalDifferenceSum,

  };

  return { success: true, data: grossProfit}
};