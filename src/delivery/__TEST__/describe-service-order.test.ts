import { describe, expect, test } from "vitest";
import {
  describeServiceOrder,
  formatLimaTime,
  type ServiceOrderIdentity,
} from "@/delivery/use-cases/describe-service-order";

// 02:40 UTC = 9:40 p. m. en Lima; 01:15 UTC = 8:15 p. m.
const nine40 = new Date("2026-10-24T02:40:00Z");
const eight15 = new Date("2026-10-24T01:15:00Z");
const time940 = formatLimaTime(nine40);
const time815 = formatLimaTime(eight15);

const takeAway = (customerName: string | null): ServiceOrderIdentity => ({
  channel: "TAKE_AWAY",
  customerName,
  openedAt: nine40,
});
const delivery = (customerName: string | null): ServiceOrderIdentity => ({
  channel: "DELIVERY",
  customerName,
  phone: "987 654 321",
  openedAt: eight15,
});

describe("describeServiceOrder", () => {
  test("titula la tarjeta de un para llevar de Rosa con «Rosa» y «Para llevar · desde las 9:40 p. m.»", () => {
    const labels = describeServiceOrder(takeAway("Rosa"));
    expect(labels.cardTitle).toBe("Rosa");
    expect(labels.cardSubtitle).toBe(`Para llevar · desde las ${time940}`);
  });

  test("titula la tarjeta de un para llevar sin nombre con «Para llevar» y «Desde las 9:40 p. m.»", () => {
    const labels = describeServiceOrder(takeAway(null));
    expect(labels.cardTitle).toBe("Para llevar");
    expect(labels.cardSubtitle).toBe(`Desde las ${time940}`);
  });

  test("titula la tarjeta de un delivery sin nombre con el teléfono y sin subtítulo", () => {
    const labels = describeServiceOrder(delivery(null));
    expect(labels.cardTitle).toBe("987 654 321");
    expect(labels.cardSubtitle).toBeNull();
    expect(describeServiceOrder(delivery("Ana")).cardSubtitle).toBe(
      "987 654 321",
    );
  });

  test("nombra la toma de pedido «Para llevar · Rosa», «Para llevar», «Delivery · Ana» y «Delivery · 987 654 321»", () => {
    expect(describeServiceOrder(takeAway("Rosa")).heading).toBe(
      "Para llevar · Rosa",
    );
    expect(describeServiceOrder(takeAway(null)).heading).toBe("Para llevar");
    expect(describeServiceOrder(delivery("Ana")).heading).toBe(
      "Delivery · Ana",
    );
    expect(describeServiceOrder(delivery(null)).heading).toBe(
      "Delivery · 987 654 321",
    );
  });

  test("anuncia «Pedido de Rosa enviado» y, sin nombre, «Pedido para llevar enviado»", () => {
    expect(describeServiceOrder(takeAway("Rosa")).sentTitle).toBe(
      "Pedido de Rosa enviado",
    );
    expect(describeServiceOrder(takeAway(null)).sentTitle).toBe(
      "Pedido para llevar enviado",
    );
  });

  test("anuncia «Pedido de Ana enviado» para un delivery con nombre y «Pedido de delivery enviado» sin nombre", () => {
    expect(describeServiceOrder(delivery("Ana")).sentTitle).toBe(
      "Pedido de Ana enviado",
    );
    expect(describeServiceOrder(delivery(null)).sentTitle).toBe(
      "Pedido de delivery enviado",
    );
  });

  test("etiqueta la comanda de un para llevar sin nombre como «pedido de las 9:40 p. m.»", () => {
    expect(describeServiceOrder(takeAway(null)).ticketLabel).toBe(
      `pedido de las ${time940}`,
    );
    expect(describeServiceOrder(takeAway("Rosa")).ticketLabel).toBe("Rosa");
  });

  test("etiqueta la comanda de un delivery sin nombre con la hora de apertura y nunca con el teléfono", () => {
    const label = describeServiceOrder(delivery(null)).ticketLabel;
    expect(label).toBe(`pedido de las ${time815}`);
    expect(label).not.toContain("987");
  });

  test("etiqueta «Impresiones pendientes» como «Delivery · pedido de las 8:15 p. m.» sin teléfono", () => {
    const label = describeServiceOrder(delivery(null)).printLabel;
    expect(label).toBe(`Delivery · pedido de las ${time815}`);
    expect(label).not.toContain("987");
    expect(describeServiceOrder(takeAway("Rosa")).printLabel).toBe(
      "Para llevar · Rosa",
    );
  });

  test("etiqueta el aviso de cierre y «Entregados hoy» de un delivery sin nombre como «Delivery · 987 654 321»", () => {
    expect(describeServiceOrder(delivery(null)).summaryLabel).toBe(
      "Delivery · 987 654 321",
    );
    expect(describeServiceOrder(takeAway(null)).summaryLabel).toBe(
      `Para llevar · pedido de las ${time940}`,
    );
  });

  test("usa la hora de Lima: 02:40 UTC se muestra como 9:40 p. m.", () => {
    expect(time940.replace(/\s/g, " ")).toBe("9:40 p. m.");
  });

  test("trata un nombre de solo espacios como sin nombre", () => {
    expect(describeServiceOrder(takeAway("   ")).cardTitle).toBe("Para llevar");
    expect(describeServiceOrder(delivery("  ")).cardTitle).toBe("987 654 321");
  });
});
