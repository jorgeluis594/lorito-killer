import { describe, expect, test } from "vitest";
import { getDeliveryTransition } from "../use-cases/delivery-transition";

describe("getDeliveryTransition", () => {
  test("despacha un pedido pendiente", () => {
    expect(getDeliveryTransition("PENDING", "DISPATCH")).toEqual({
      success: true,
      data: "DISPATCHED",
    });
  });

  test("exige despacho para entregar, pero no cobro", () => {
    expect(getDeliveryTransition("PENDING", "DELIVER").success).toBe(false);
    expect(getDeliveryTransition("DISPATCHED", "DELIVER")).toEqual({
      success: true,
      data: "DELIVERED",
    });
  });

  test("recupera transiciones ya registradas", () => {
    expect(getDeliveryTransition("DISPATCHED", "DISPATCH")).toEqual({
      success: true,
      data: "DISPATCHED",
    });
    expect(getDeliveryTransition("DELIVERED", "DELIVER")).toEqual({
      success: true,
      data: "DELIVERED",
    });
  });
});
