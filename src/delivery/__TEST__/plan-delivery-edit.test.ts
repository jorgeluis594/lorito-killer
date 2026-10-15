import { describe, expect, test } from "vitest";
import { planDeliveryEdit } from "../use-cases/plan-delivery-edit";

const current = { fee: 5 };

describe("planDeliveryEdit", () => {
  test("sin cambio de envío: admitido con y sin documento", () => {
    for (const locked of [false, true])
      expect(planDeliveryEdit(current, { fee: 5 }, locked)).toEqual({
        success: true,
        data: { feeChanged: false },
      });
  });

  test("cambiar el envío sin documento marca recalcular el total", () => {
    expect(planDeliveryEdit(current, { fee: 8 }, false)).toEqual({
      success: true,
      data: { feeChanged: true },
    });
  });

  test("con documento rechaza cambiar el envío", () => {
    expect(planDeliveryEdit(current, { fee: 8 }, true).success).toBe(false);
  });

  test("comparación en centavos: 5 y 5.00 son el mismo envío", () => {
    expect(planDeliveryEdit(current, { fee: 5.0 }, true)).toMatchObject({
      success: true,
    });
  });
});
