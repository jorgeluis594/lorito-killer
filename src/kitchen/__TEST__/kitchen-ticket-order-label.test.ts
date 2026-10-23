import { describe, expect, test } from "vitest";
import { kitchenTicketOrderLabel } from "@/kitchen/use-cases/kitchen-ticket-order-label";
import { formatLimaTime } from "@/delivery/use-cases/describe-service-order";

const openedAt = new Date("2026-10-24T02:40:00Z");

describe("kitchenTicketOrderLabel", () => {
  test("usa la etiqueta o el número de la mesa en una mesa", () => {
    expect(
      kitchenTicketOrderLabel({
        table: { label: "Terraza", number: 4 },
        identity: null,
      }),
    ).toBe("Terraza");
    expect(
      kitchenTicketOrderLabel({
        table: { label: null, number: 4 },
        identity: null,
      }),
    ).toBe("4");
  });

  test("usa el nombre o la hora de apertura en un pedido sin mesa y nunca el código interno", () => {
    expect(
      kitchenTicketOrderLabel({
        table: null,
        identity: { channel: "TAKE_AWAY", customerName: "Rosa", openedAt },
      }),
    ).toBe("Rosa");
    expect(
      kitchenTicketOrderLabel({
        table: null,
        identity: { channel: "TAKE_AWAY", customerName: null, openedAt },
      }),
    ).toBe(`pedido de las ${formatLimaTime(openedAt)}`);
  });
});
