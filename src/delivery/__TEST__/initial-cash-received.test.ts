import { describe, expect, test } from "vitest";
import { initialCashReceived } from "../use-cases/initial-cash-received";

describe("initialCashReceived", () => {
  test("prellena con el “paga con” cuando el medio esperado es efectivo", () => {
    expect(initialCashReceived("CASH", 100)).toBe("100");
    expect(initialCashReceived("CASH", 100.5)).toBe("100.5");
  });

  test.each([
    ["sin “paga con”", "CASH", null],
    ["“paga con” cero", "CASH", 0],
    ["billetera", "WALLET", 100],
    ["sin medio esperado", null, 100],
    ["sin Delivery", undefined, undefined],
  ] as const)("deja el campo vacío %s", (_label, method, paysWith) => {
    expect(initialCashReceived(method, paysWith)).toBe("");
  });
});
