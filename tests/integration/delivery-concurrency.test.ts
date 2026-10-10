import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import { submitFulfillmentRound } from "@/order/rounds/fulfillment-repository";
import { payFulfillmentOrder } from "@/order/fulfillment-payment-repository";
import {
  createFixture,
  type RestaurantFixture,
} from "./helpers/restaurant-fixture";

let f: RestaurantFixture;
const db = () => prisma();

beforeAll(async () => {
  f = await createFixture("del03-race");
});
afterAll(async () => {
  await f.destroy();
});

describe("§11.9 concurrencia del cobro de Delivery (DEL-03)", () => {
  test("X3 dos cobros del mismo pedido producen un pago y un documento", async () => {
    const orderId = await f.createOrder({});
    const input = await f.paymentInput(orderId);
    const cashier = f.user("cashier");
    const results = await Promise.all([
      payFulfillmentOrder(cashier, input),
      payFulfillmentOrder(cashier, input),
    ]);
    expect(
      results.every((result) => result.success),
      JSON.stringify(results),
    ).toBe(true);
    expect(results[0]).toEqual(results[1]);
    expect(await db().payment.count({ where: { orderId } })).toBe(1);
    expect(await db().document.count({ where: { orderId } })).toBe(1);
    expect(
      await db().documentTaxDispatch.count({
        where: { document: { orderId } },
      }),
    ).toBe(1);
  });

  test("X3 dos cobros combinados con medios distintos: solo uno gana", async () => {
    const orderId = await f.createOrder({});
    const [card, cash] = [
      await f.paymentInput(orderId, { method: "debit_card" }),
      await f.paymentInput(orderId, { method: "cash", cashReceived: 60 }),
    ];
    const results = await Promise.all([
      payFulfillmentOrder(f.user("cashier"), card),
      payFulfillmentOrder(f.user("admin"), cash),
    ]);
    // Uno cobra; el otro, ya con el pedido pagado, devuelve ese mismo resultado
    // o se rechaza, pero nunca se duplican pagos ni documento.
    expect(results.some((result) => result.success)).toBe(true);
    expect(await db().payment.count({ where: { orderId } })).toBe(1);
    expect(await db().document.count({ where: { orderId } })).toBe(1);
  });

  test("X4 dos pedidos por la última unidad de A: uno se acepta y el stock no queda negativo", async () => {
    await f.setStockA(1);
    const attempt = () =>
      submitFulfillmentRound(f.ids.company, f.ids.seller, {
        roundId: randomUUID(),
        orderType: "DELIVERY",
        items: [{ productId: f.ids.productA, quantity: 1 }],
        delivery: f.defaultDelivery,
      } as Parameters<typeof submitFulfillmentRound>[2]);
    const results = await Promise.all([attempt(), attempt()]);
    for (const result of results)
      if (result.success) f.orderIds.push(result.data.orderId);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(await f.stockA()).toBe(0);
    const rejected = results.find((result) => !result.success);
    expect(rejected?.success).toBe(false);
    // El pedido rechazado no deja filas ni movimientos de stock.
    expect(
      await db().order.count({
        where: { companyId: f.ids.company, orderType: "DELIVERY" },
      }),
    ).toBe(await db().order.count({ where: { id: { in: f.orderIds } } }));
  });

  test("X5 cobros simultáneos de pedidos distintos en la misma serie numeran sin repetir", async () => {
    await f.setStockA(10);
    const orderIds: string[] = [];
    for (let i = 0; i < 4; i += 1) orderIds.push(await f.createOrder({}));
    const inputs = await Promise.all(
      orderIds.map((orderId) => f.paymentInput(orderId)),
    );
    const lastBefore = (
      await db().document.aggregate({
        _max: { number: true },
        where: { companyId: f.ids.company, series: "B001" },
      })
    )._max.number!;
    const cashier = f.user("cashier");
    const results = await Promise.all(
      inputs.map((input) => payFulfillmentOrder(cashier, input)),
    );
    expect(
      results.every((result) => result.success),
      JSON.stringify(results),
    ).toBe(true);

    const documents = await db().document.findMany({
      where: { orderId: { in: orderIds }, series: "B001" },
      orderBy: { number: "asc" },
    });
    expect(documents).toHaveLength(4);
    const numbers = documents.map((document) => document.number);
    expect(new Set(numbers).size).toBe(4);
    expect(numbers).toEqual([1, 2, 3, 4].map((n) => lastBefore + n));
    for (const orderId of orderIds)
      expect(await db().payment.count({ where: { orderId } })).toBe(1);
  });
});
