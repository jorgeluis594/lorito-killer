import { afterAll, beforeAll, describe, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import { payTable } from "@/table/payment-repository";
import {
  createFixture,
  type RestaurantFixture,
} from "./helpers/restaurant-fixture";

let f: RestaurantFixture;
const db = () => prisma();

type PayInput = Parameters<typeof payTable>[1];
/**
 * Cobros simultáneos: payTable no reintenta conflictos de serialización, así
 * que el perdedor recibe "consulta el estado". Se reintenta como lo haría la
 * pantalla tras consultar; nunca debe duplicar pagos ni documentos.
 */
async function payConcurrently(
  calls: Array<[ReturnType<RestaurantFixture["user"]>, PayInput]>,
) {
  const results = await Promise.all(
    calls.map(([user, input]) => payTable(user, input)),
  );
  for (const result of results)
    if (!result.success)
      expect(result.message).toMatch(/Consulta (su|el) estado/);
  for (const [index, result] of results.entries())
    if (!result.success) results[index] = await payTable(...calls[index]);
  return results;
}

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
    const results = await payConcurrently([
      [cashier, input],
      [cashier, input],
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

  test("X3 dos cobros con medios distintos: uno cobra y el otro recupera ese mismo cobro", async () => {
    const orderId = await f.createOrder({});
    const [card, cash] = [
      await f.paymentInput(orderId, { method: "debit_card" }),
      await f.paymentInput(orderId, { method: "cash", cashReceived: 60 }),
    ];
    const results = await payConcurrently([
      [f.user("cashier"), card],
      [f.user("admin"), cash],
    ]);
    // Como en Mesas, el segundo cobro devuelve el ya registrado sin duplicarlo.
    expect(
      results.every((result) => result.success),
      JSON.stringify(results),
    ).toBe(true);
    expect(results[0]).toEqual(results[1]);
    expect(await db().payment.count({ where: { orderId } })).toBe(1);
    expect(await db().document.count({ where: { orderId } })).toBe(1);
  });

  test("X4 dos cobros por la última unidad de A: uno se acepta y el stock no queda negativo", async () => {
    // El stock se descuenta al cobrar, como en Mesas.
    const orderIds = [
      await f.createOrder({
        items: [{ productId: f.ids.productA, quantity: 1 }],
      }),
      await f.createOrder({
        items: [{ productId: f.ids.productA, quantity: 1 }],
      }),
    ];
    await f.setStockA(1);
    const inputs = await Promise.all(
      orderIds.map((orderId) => f.paymentInput(orderId)),
    );
    const results = await Promise.all(
      inputs.map((input) => payTable(f.user("cashier"), input)),
    );
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(await f.stockA()).toBe(0);
    const rejected = orderIds.find((_, index) => !results[index].success)!;
    expect(await db().payment.count({ where: { orderId: rejected } })).toBe(0);
    expect(await db().document.count({ where: { orderId: rejected } })).toBe(0);
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
    const results = await payConcurrently(
      inputs.map((input) => [cashier, input]),
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
