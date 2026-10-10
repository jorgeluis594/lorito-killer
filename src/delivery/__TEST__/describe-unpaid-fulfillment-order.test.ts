import { describe, expect, test } from "vitest";
import { describeUnpaidFulfillmentOrder } from "@/delivery/use-cases/describe-unpaid-fulfillment-order";

describe("describeUnpaidFulfillmentOrder", () => {
  test("Delivery muestra el nombre del cliente y su estado", () => {
    expect(
      describeUnpaidFulfillmentOrder({
        orderType: "DELIVERY",
        customerName: " Maria Quispe ",
        deliveryStatus: "DISPATCHED",
      }),
    ).toEqual({ customerLabel: "Maria Quispe", statusLabel: "Despachado" });
  });

  test("Para llevar no tiene cliente y se rotula Para llevar", () => {
    expect(
      describeUnpaidFulfillmentOrder({
        orderType: "TAKE_AWAY",
        customerName: null,
        deliveryStatus: null,
      }),
    ).toEqual({ customerLabel: "Para llevar", statusLabel: "Pendiente" });
  });

  test("Para llevar ignora un nombre inesperado", () => {
    expect(
      describeUnpaidFulfillmentOrder({
        orderType: "TAKE_AWAY",
        customerName: "Otro",
        deliveryStatus: null,
      }).customerLabel,
    ).toBe("Para llevar");
  });
});
