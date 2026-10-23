import { describe, expect, test } from "vitest";
import { describeUnpaidFulfillmentOrder } from "@/delivery/use-cases/describe-unpaid-fulfillment-order";

const openedAt = new Date("2026-10-24T02:40:00Z");

describe("describeUnpaidFulfillmentOrder", () => {
  test("un delivery sin nombre despachado aparece como «Delivery · 987 654 321» y «Despachado», nunca como «Para llevar»", () => {
    expect(
      describeUnpaidFulfillmentOrder({
        identity: {
          channel: "DELIVERY",
          customerName: null,
          phone: "987 654 321",
          openedAt,
        },
        deliveryStatus: "DISPATCHED",
      }),
    ).toEqual({
      orderLabel: "Delivery · 987 654 321",
      statusLabel: "Despachado",
    });
  });

  test("un para llevar de Rosa aparece como «Para llevar · Rosa» y «Pendiente»", () => {
    expect(
      describeUnpaidFulfillmentOrder({
        identity: { channel: "TAKE_AWAY", customerName: "Rosa", openedAt },
        deliveryStatus: null,
      }),
    ).toEqual({ orderLabel: "Para llevar · Rosa", statusLabel: "Pendiente" });
  });
});
