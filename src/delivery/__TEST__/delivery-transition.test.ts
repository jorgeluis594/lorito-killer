import { describe, expect, test } from "vitest";
import { getDeliveryTransition } from "../use-cases/delivery-transition";

describe("getDeliveryTransition", () => {
  test("despacha sin exigir pago ni preparación digital", () => {
    expect(getDeliveryTransition("PENDING", "DISPATCH", "PENDING")).toEqual({
      success: true,
      data: "DISPATCHED",
    });
  });

  test("exige despacho y pago para entregar", () => {
    expect(getDeliveryTransition("PENDING", "DELIVER", "PAID").success).toBe(
      false,
    );
    expect(
      getDeliveryTransition("DISPATCHED", "DELIVER", "PENDING").success,
    ).toBe(false);
    expect(getDeliveryTransition("DISPATCHED", "DELIVER", "PAID")).toEqual({
      success: true,
      data: "DELIVERED",
    });
  });

  test("recupera transiciones ya registradas", () => {
    expect(getDeliveryTransition("DISPATCHED", "DISPATCH", "PENDING")).toEqual({
      success: true,
      data: "DISPATCHED",
    });
    expect(getDeliveryTransition("DELIVERED", "DELIVER", "PAID")).toEqual({
      success: true,
      data: "DELIVERED",
    });
  });
});
