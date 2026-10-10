import { describe, expect, test } from "vitest";
import { calculateOrderTotals } from "../use-cases/calculate-order-totals";

describe("calculateOrderTotals", () => {
  test("suma el envío a total y netTotal sin crear descuento", () => {
    const totals = calculateOrderTotals(
      { total: 50, netTotal: 50, discountAmount: 0 },
      5,
    );
    expect(totals.total.toString()).toBe("55");
    expect(totals.netTotal.toString()).toBe("55");
    expect(totals.discountAmount.toString()).toBe("0");
  });

  test("sin envío conserva los totales de los ítems", () => {
    const totals = calculateOrderTotals(
      { total: "45", netTotal: "50", discountAmount: "5" },
      null,
    );
    expect(totals.total.toString()).toBe("45");
    expect(totals.netTotal.toString()).toBe("50");
    expect(totals.discountAmount.toString()).toBe("5");
  });

  test("evita errores de punto flotante", () => {
    expect(
      calculateOrderTotals(
        { total: "0.1", netTotal: "0.1", discountAmount: 0 },
        "0.2",
      ).total.toString(),
    ).toBe("0.3");
  });
});
