import { describe, expect, test } from "vitest";
import { planDeliveryEdit } from "../use-cases/plan-delivery-edit";
import type { DeliveryDetails } from "../use-cases/validate-delivery-details";

const current: DeliveryDetails = {
  name: "Maria Quispe",
  phone: "987654321",
  address: "Av. Los Olivos 123",
  reference: null,
  fee: 5,
  expectedPaymentMethod: "CASH",
  cashPaysWith: 100,
};

describe("planDeliveryEdit", () => {
  test("solo contacto: admitido con y sin documento, sin tocar el envío", () => {
    const next = { ...current, address: "Jr. Lima 45", phone: "912345678" };
    for (const locked of [false, true])
      expect(planDeliveryEdit(current, next, locked)).toEqual({
        success: true,
        data: { logisticsChanged: false, feeChanged: false },
      });
  });

  test("cambiar el envío sin documento marca recalcular el total", () => {
    expect(planDeliveryEdit(current, { ...current, fee: 8 }, false)).toEqual({
      success: true,
      data: { logisticsChanged: true, feeChanged: true },
    });
  });

  test.each([
    ["envío", { fee: 8 }],
    ["medio esperado", { expectedPaymentMethod: "WALLET", cashPaysWith: null }],
    ["paga con", { cashPaysWith: 120 }],
    ["paga con borrado", { cashPaysWith: null }],
  ] as const)(
    "con documento rechaza cambiar %s aunque cambie el contacto",
    (_, change) => {
      const result = planDeliveryEdit(
        current,
        { ...current, ...change, name: "Otra persona" },
        true,
      );
      expect(result.success).toBe(false);
    },
  );

  test("comparación en centavos: 5 y 5.00 son el mismo envío", () => {
    expect(
      planDeliveryEdit(current, { ...current, fee: 5.0 }, true),
    ).toMatchObject({ success: true });
  });
});
