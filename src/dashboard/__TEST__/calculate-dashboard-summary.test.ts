import { describe, expect, test } from "vitest";
import {
  calculateAverageTicket,
  calculateCashDifference,
  calculateDiscountTotal,
  calculateExpectedCash,
  calculatePaidSalesKpis,
} from "@/dashboard/use-cases/calculate-dashboard-summary";

describe("calculatePaidSalesKpis", () => {
  test("excludes pending and cancelled orders from paid sales", () => {
    const result = calculatePaidSalesKpis([
      { status: "COMPLETED", total: 120 },
      { status: "PENDING", total: 80 },
      { status: "CANCELLED", total: 50 },
      { status: "COMPLETED", total: 30 },
    ]);

    expect(result).toEqual({
      paidSalesTotal: 150,
      paidSalesCount: 2,
      averageTicket: 75,
    });
  });

  test("returns average ticket as zero when there are no paid sales", () => {
    expect(calculateAverageTicket(100, 0)).toBe(0);
  });
});

describe("cash calculations", () => {
  test("calculates expected cash with only cash payments minus expenses", () => {
    expect(
      calculateExpectedCash({
        initialAmount: 100,
        cashPayments: 250.2,
        expenses: 20.1,
      }),
    ).toBe(330.1);
  });

  test("calculates closed cash shift difference", () => {
    expect(
      calculateCashDifference({
        initialAmount: 100,
        cashPayments: 250,
        expenses: 20,
        finalAmount: 340,
      }),
    ).toBe(10);
  });
});

describe("calculateDiscountTotal", () => {
  test("adds order and item discounts with decimal-safe math", () => {
    expect(
      calculateDiscountTotal({
        orderDiscounts: 0.1,
        itemDiscounts: 0.2,
      }),
    ).toBe(0.3);
  });
});
