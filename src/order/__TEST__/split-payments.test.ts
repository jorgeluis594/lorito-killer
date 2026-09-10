import { describe, expect, test } from "vitest";
import type { Payment } from "../types";
import {
  splitPaymentAmounts,
  validatePayments,
} from "../use-cases/split-payments";

const card = (amount: number): Payment => ({
  method: "credit_card",
  amount,
  cashShiftId: "shift",
});

describe("splitPaymentAmounts", () => {
  test("splits by cents and puts the rounding remainder in the last parts", () => {
    expect(splitPaymentAmounts(10, 3)).toEqual([3.33, 3.33, 3.34]);
    expect(splitPaymentAmounts(0.05, 2)).toEqual([0.02, 0.03]);
  });

  test.for([
    { total: 0, parts: 2 },
    { total: 10, parts: 1 },
    { total: 10, parts: 2.5 },
    { total: Number.NaN, parts: 2 },
  ])("rejects invalid total $total or parts $parts", ({ total, parts }) => {
    expect(() => splitPaymentAmounts(total, parts)).toThrow(RangeError);
  });
});

describe("validatePayments", () => {
  test("accepts multiple contributions using the same payment method", () => {
    expect(validatePayments(10, [card(4), card(6)])).toEqual({
      success: true,
      data: undefined,
    });
  });

  test.for([
    { payments: [] as Payment[], message: "Agrega al menos un aporte de pago" },
    { payments: [card(0)], message: "Cada aporte debe tener un monto mayor a cero" },
    { payments: [card(Number.NaN)], message: "Cada aporte debe tener un monto mayor a cero" },
    { payments: [card(9.99)], message: "La suma de los pagos debe coincidir con el total" },
  ])("rejects invalid contributions", ({ payments, message }) => {
    expect(validatePayments(10, payments)).toEqual({ success: false, message });
  });
});
