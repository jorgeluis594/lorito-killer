import Decimal from "decimal.js";
import type { DashboardKpis } from "@/dashboard/types";

export type DashboardOrderFact = {
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  total: number;
  discountAmount?: number;
};

export type DashboardCashFact = {
  initialAmount: number;
  cashPayments: number;
  expenses: number;
  finalAmount?: number;
};

const add = (a: number, b: number) => new Decimal(a).add(b).toNumber();
const sub = (a: number, b: number) => new Decimal(a).sub(b).toNumber();
const div = (a: number, b: number) => new Decimal(a).div(b).toNumber();

export function calculateAverageTicket(total: number, count: number) {
  if (count <= 0) return 0;
  return div(total, count);
}

export function calculatePaidSalesKpis(
  facts: DashboardOrderFact[],
): Pick<DashboardKpis, "paidSalesTotal" | "paidSalesCount" | "averageTicket"> {
  const completed = facts.filter((fact) => fact.status === "COMPLETED");
  const paidSalesTotal = completed.reduce(
    (total, fact) => add(total, fact.total),
    0,
  );
  const paidSalesCount = completed.length;

  return {
    paidSalesTotal,
    paidSalesCount,
    averageTicket: calculateAverageTicket(paidSalesTotal, paidSalesCount),
  };
}

export function calculateExpectedCash({
  initialAmount,
  cashPayments,
  expenses,
}: DashboardCashFact) {
  return sub(add(initialAmount, cashPayments), expenses);
}

export function calculateCashDifference({
  finalAmount,
  ...fact
}: DashboardCashFact) {
  if (finalAmount === undefined) return undefined;
  return sub(finalAmount, calculateExpectedCash(fact));
}

export function calculateDiscountTotal({
  orderDiscounts,
  itemDiscounts,
}: {
  orderDiscounts: number;
  itemDiscounts: number;
}) {
  return add(orderDiscounts, itemDiscounts);
}
