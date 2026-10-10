import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import { submitFulfillmentRound } from "@/order/rounds/fulfillment-repository";
import { completeTakeAway, transitionDelivery } from "@/delivery/db_repository";
import { payFulfillmentOrder } from "@/order/fulfillment-payment-repository";
import { submitFulfillmentRound as addRound } from "@/order/rounds/fulfillment-repository";
import {
  createFixture,
  type RestaurantFixture,
} from "./helpers/restaurant-fixture";

const suffix = randomUUID();
const ids = {
  company: randomUUID(),
  user: randomUUID(),
  cashShift: randomUUID(),
  client: randomUUID(),
  printer: randomUUID(),
  hot: randomUUID(),
  cold: randomUUID(),
  hotDish: randomUUID(),
  coldDish: randomUUID(),
  stockProduct: randomUUID(),
};
const orderIds: string[] = [];

beforeAll(async () => {
  const db = prisma();
  await db.company.create({ data: { id: ids.company, address: "QA" } });
  await db.user.create({
    data: {
      id: ids.user,
      companyId: ids.company,
      email: `fulfillment-${suffix}@example.test`,
      password: "test",
      name: "Ana",
      role: "ADMIN",
    },
  });
  await db.cashShift.create({
    data: {
      id: ids.cashShift,
      userId: ids.user,
      companyId: ids.company,
      initialAmount: 100,
      status: "OPEN",
      openedAt: new Date(),
    },
  });
  await db.printClient.create({
    data: {
      id: ids.client,
      companyId: ids.company,
      machineName: "QA",
      credentialHash: suffix,
      lastSeenAt: new Date(),
    },
  });
  await db.printer.create({
    data: {
      id: ids.printer,
      companyId: ids.company,
      printClientId: ids.client,
      localName: "QA printer",
      lastDetectedAt: new Date(),
    },
  });
  await db.kitchen.createMany({
    data: [
      {
        id: ids.hot,
        companyId: ids.company,
        name: "Caliente",
        printerId: ids.printer,
      },
      { id: ids.cold, companyId: ids.company, name: "Fríos" },
    ],
  });
  await db.product.createMany({
    data: [
      {
        id: ids.hotDish,
        companyId: ids.company,
        name: "Lomo",
        description: "",
        price: 25,
        productType: "DISH",
        kitchenId: ids.hot,
      },
      {
        id: ids.coldDish,
        companyId: ids.company,
        name: "Ceviche",
        description: "",
        price: 20,
        productType: "DISH",
        kitchenId: ids.cold,
      },
      {
        id: ids.stockProduct,
        companyId: ids.company,
        name: "Gaseosa",
        description: "",
        price: 5,
        productType: "SINGLE_PRODUCT",
        unitType: "UNIT",
        stock: 10,
        purchasePrice: 2,
      },
    ],
  });
});

afterAll(async () => {
  const db = prisma();
  await db.kitchetTicketPrintJob.deleteMany({
    where: { companyId: ids.company },
  });
  await db.kitchenTicket.deleteMany({
    where: { orderRound: { orderId: { in: orderIds } } },
  });
  await db.orderItemCancellation.deleteMany({
    where: { orderRoundItem: { orderRound: { orderId: { in: orderIds } } } },
  });
  await db.orderRoundItem.deleteMany({
    where: { orderRound: { orderId: { in: orderIds } } },
  });
  await db.stockTransfer.deleteMany({ where: { companyId: ids.company } });
  await db.documentTaxDispatch.deleteMany({
    where: { companyId: ids.company },
  });
  await db.document.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.orderRound.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.cashShift.delete({ where: { id: ids.cashShift } });
  await db.product.deleteMany({ where: { companyId: ids.company } });
  await db.kitchen.deleteMany({ where: { companyId: ids.company } });
  await db.printer.delete({ where: { id: ids.printer } });
  await db.printClient.delete({ where: { id: ids.client } });
  await db.user.delete({ where: { id: ids.user } });
  await db.company.delete({ where: { id: ids.company } });
});

describe("fulfillment orders PostgreSQL integration", () => {
  test("confirms delivery atomically and recovers a concurrent retry", async () => {
    const input = {
      roundId: randomUUID(),
      orderType: "DELIVERY" as const,
      delivery: {
        name: "Cliente QA",
        phone: "987654321",
        address: "Calle QA 123",
        fee: 5,
      },
      items: [
        { productId: ids.hotDish, quantity: 1, notes: "Sin cebolla" },
        { productId: ids.coldDish, quantity: 1 },
        { productId: ids.stockProduct, quantity: 2 },
      ],
    };
    const results = await Promise.all([
      submitFulfillmentRound(ids.company, ids.user, input),
      submitFulfillmentRound(ids.company, ids.user, input),
    ]);
    expect(
      results.every((result) => result.success),
      JSON.stringify(results),
    ).toBe(true);
    if (!results[0].success || !results[1].success) return;
    expect(results[0].data).toEqual(results[1].data);
    orderIds.push(results[0].data.orderId);

    const order = await prisma().order.findUniqueOrThrow({
      where: { id: results[0].data.orderId },
      include: {
        delivery: true,
        rounds: {
          include: {
            items: true,
            kitchenTickets: { include: { printJobs: true } },
          },
        },
      },
    });
    expect(order).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
      orderType: "DELIVERY",
    });
    expect(order.delivery?.status).toBe("PENDING");
    expect(order.rounds).toHaveLength(1);
    expect(order.rounds[0].items).toHaveLength(3);
    expect(order.rounds[0].kitchenTickets).toHaveLength(2);
    expect(
      order.rounds[0].kitchenTickets.flatMap((ticket) => ticket.printJobs),
    ).toHaveLength(1);
    expect(
      (
        await prisma().product.findUniqueOrThrow({
          where: { id: ids.stockProduct },
        })
      ).stock?.toNumber(),
    ).toBe(8);
  });

  test("adds only a new consecutive round and dispatches without payment", async () => {
    const orderId = orderIds[0];
    const result = await submitFulfillmentRound(ids.company, ids.user, {
      orderId,
      roundId: randomUUID(),
      orderType: "DELIVERY",
      items: [{ productId: ids.hotDish, quantity: 1, notes: "Bien cocido" }],
    });
    expect(result.success && result.data.number).toBe(2);
    expect(await prisma().orderRound.count({ where: { orderId } })).toBe(2);
    expect(
      await prisma().kitchenTicket.count({
        where: { orderRound: { orderId } },
      }),
    ).toBe(3);

    const dispatched = await transitionDelivery(
      ids.company,
      ids.user,
      orderId,
      "DISPATCH",
    );
    expect(dispatched).toMatchObject({
      success: true,
      data: { status: "DISPATCHED", paymentStatus: "PENDING" },
    });
    const rejected = await transitionDelivery(
      ids.company,
      ids.user,
      orderId,
      "DELIVER",
    );
    expect(rejected.success).toBe(false);
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: orderId },
    });
    const paymentInput = {
      orderId,
      orderVersion: order.updatedAt.toISOString(),
      expectedTotal: order.total.toNumber(),
      cashShiftId: ids.cashShift,
      method: "cash" as const,
      receipt: { documentType: "ticket" as const },
      cashReceived: order.total.toNumber(),
    };
    const paid = await payFulfillmentOrder(
      {
        id: ids.user,
        companyId: ids.company,
        email: `fulfillment-${suffix}@example.test`,
        name: "Ana",
        role: "ADMIN",
        active: true,
      },
      paymentInput,
    );
    expect(paid.success).toBe(true);
    expect(
      await payFulfillmentOrder(
        {
          id: ids.user,
          companyId: ids.company,
          email: `fulfillment-${suffix}@example.test`,
          name: "Ana",
          role: "ADMIN",
          active: true,
        },
        paymentInput,
      ),
    ).toEqual(paid);
    expect(
      await prisma().order.findUniqueOrThrow({ where: { id: orderId } }),
    ).toMatchObject({
      paymentStatus: "PAID",
      status: "PENDING",
    });
    expect(await prisma().payment.count({ where: { orderId } })).toBe(1);
    expect(await prisma().document.count({ where: { orderId } })).toBe(1);
    expect(
      (
        await prisma().product.findUniqueOrThrow({
          where: { id: ids.stockProduct },
        })
      ).stock?.toNumber(),
    ).toBe(8);
    const delivered = await transitionDelivery(
      ids.company,
      ids.user,
      orderId,
      "DELIVER",
    );
    expect(delivered).toMatchObject({
      success: true,
      data: { status: "DELIVERED", paymentStatus: "PAID" },
    });
    expect(
      (await prisma().order.findUniqueOrThrow({ where: { id: orderId } }))
        .status,
    ).toBe("COMPLETED");
  });

  test("confirms, charges and delivers takeaway without duplicating stock", async () => {
    const confirmed = await submitFulfillmentRound(ids.company, ids.user, {
      roundId: randomUUID(),
      orderType: "TAKE_AWAY",
      items: [{ productId: ids.stockProduct, quantity: 1 }],
    });
    expect(confirmed.success).toBe(true);
    if (!confirmed.success) return;
    orderIds.push(confirmed.data.orderId);
    const order = await prisma().order.findUniqueOrThrow({
      where: { id: confirmed.data.orderId },
      include: { delivery: true },
    });
    expect(order).toMatchObject({
      orderType: "TAKE_AWAY",
      status: "PENDING",
      paymentStatus: "PENDING",
      delivery: null,
    });
    expect(
      await completeTakeAway(ids.company, confirmed.data.orderId),
    ).toMatchObject({ success: false });

    const paid = await payFulfillmentOrder(
      {
        id: ids.user,
        companyId: ids.company,
        email: `fulfillment-${suffix}@example.test`,
        name: "Ana",
        role: "ADMIN",
        active: true,
      },
      {
        orderId: order.id,
        orderVersion: order.updatedAt.toISOString(),
        expectedTotal: order.total.toNumber(),
        cashShiftId: ids.cashShift,
        method: "debit_card",
        receipt: { documentType: "ticket" },
      },
    );
    expect(paid.success).toBe(true);
    expect(
      await completeTakeAway(ids.company, confirmed.data.orderId),
    ).toMatchObject({ success: true, data: { status: "COMPLETED" } });
    expect(
      (
        await prisma().product.findUniqueOrThrow({
          where: { id: ids.stockProduct },
        })
      ).stock?.toNumber(),
    ).toBe(7);
  });
});

describe("§11.2 recorridos completos de Delivery (DEL-03)", () => {
  let f: RestaurantFixture;
  const db = () => prisma();

  beforeAll(async () => {
    f = await createFixture("del03-flow");
  });
  afterAll(async () => {
    await f.destroy();
  });

  const transition = (orderId: string, action: "DISPATCH" | "DELIVER") =>
    transitionDelivery(f.ids.company, f.ids.seller, orderId, action);
  const rows = async (orderId: string) => ({
    payments: await db().payment.count({ where: { orderId } }),
    documents: await db().document.count({ where: { orderId } }),
    transfers: await db().stockTransfer.count({
      where: { companyId: f.ids.company },
    }),
    rounds: await db().orderRound.count({ where: { orderId } }),
  });
  const documentPayload = async (orderId: string) => {
    const { result, bodies } = await f.sendToFactpro(
      (await f.documentFor(orderId)).id,
    );
    expect(result.success).toBe(true);
    return bodies[0];
  };
  const shipping = (payload: Record<string, any>): unknown[] =>
    payload.items.filter(
      (item: { descripcion: string }) => item.descripcion === "Envío",
    );

  test("R1 cobro al crear: boleta de 55 con Envío, despacho y entrega", async () => {
    await f.setStockA(10);
    const orderId = await f.createOrder({});
    const paid = await f.pay(orderId);
    expect(paid, JSON.stringify(paid)).toMatchObject({
      success: true,
      data: { total: 55 },
    });
    expect(await transition(orderId, "DISPATCH")).toMatchObject({
      success: true,
    });
    expect(await transition(orderId, "DELIVER")).toMatchObject({
      success: true,
    });

    const order = await db().order.findUniqueOrThrow({
      where: { id: orderId },
      include: { delivery: true, payments: true, documents: true },
    });
    expect(order).toMatchObject({ status: "COMPLETED", paymentStatus: "PAID" });
    expect(order.total.toNumber()).toBe(55);
    expect(
      order.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0),
    ).toBe(55);
    expect(order.documents).toHaveLength(1);
    expect(order.documents[0].total.toNumber()).toBe(55);
    expect(shipping(await documentPayload(orderId))).toHaveLength(1);
    expect(await f.stockA()).toBe(9);
    expect(order.delivery).toMatchObject({
      status: "DELIVERED",
      createdById: f.ids.seller,
      dispatchedById: f.ids.seller,
      deliveredById: f.ids.seller,
    });
    expect(order.delivery?.dispatchedAt).toBeInstanceOf(Date);
    expect(order.delivery?.deliveredAt).toBeInstanceOf(Date);
    expect(order.payments[0].data).toMatchObject({
      confirmedById: f.ids.cashier,
      source: "delivery",
    });
  });

  test("R2 cobro tras una segunda ronda: 70 y comanda adicional solo con C", async () => {
    const orderId = await f.createOrder({});
    const added = await addRound(f.ids.company, f.ids.seller, {
      orderId,
      roundId: randomUUID(),
      orderType: "DELIVERY",
      items: [{ productId: f.ids.productC, quantity: 1 }],
    });
    expect(added, JSON.stringify(added)).toMatchObject({ success: true });
    const round2 = await db().orderRound.findFirstOrThrow({
      where: { orderId, number: 2 },
      include: { items: true, kitchenTickets: true },
    });
    expect(round2.items).toHaveLength(1);
    expect(round2.items[0].productId).toBe(f.ids.productC);
    // C no tiene estación: no se genera comanda para la ronda adicional.
    expect(round2.kitchenTickets).toHaveLength(0);

    const paid = await f.pay(orderId);
    expect(paid).toMatchObject({ success: true, data: { total: 70 } });
    const document = await f.documentFor(orderId);
    expect(document.total.toNumber()).toBe(70);
    const payload = await documentPayload(orderId);
    expect(payload.totales.total_venta).toBe(70);
    expect(shipping(payload)).toHaveLength(1);
    expect(payload.items).toHaveLength(4);
  });

  test("R3 cobro al entregar: entrega rechazada sin pago; efectivo 100 con vuelto 45", async () => {
    const orderId = await f.createOrder({
      delivery: {
        ...f.defaultDelivery,
        expectedPaymentMethod: "CASH",
        cashPaysWith: 100,
      },
    });
    expect(await transition(orderId, "DISPATCH")).toMatchObject({
      success: true,
    });
    const early = await transition(orderId, "DELIVER");
    expect(early.success).toBe(false);
    expect(
      (await db().delivery.findUniqueOrThrow({ where: { orderId } })).status,
    ).toBe("DISPATCHED");

    const paid = await f.pay(orderId, {
      method: "cash",
      cashReceived: 100,
      receipt: { documentType: "ticket" },
    });
    expect(paid, JSON.stringify(paid)).toMatchObject({
      success: true,
      data: { total: 55 },
    });
    const payment = await db().payment.findFirstOrThrow({ where: { orderId } });
    expect(payment.amount.toNumber()).toBe(55);
    expect(payment.data).toMatchObject({ received_amount: 100, change: 45 });
    expect(await transition(orderId, "DELIVER")).toMatchObject({
      success: true,
      data: { status: "DELIVERED" },
    });
  });

  test("R4 Para llevar: sin Delivery ni envío, stock A 8 y COMPLETED", async () => {
    await f.setStockA(10);
    const orderId = await f.createOrder({
      orderType: "TAKE_AWAY",
      items: [{ productId: f.ids.productA, quantity: 2 }],
    });
    const paid = await f.pay(orderId);
    expect(paid).toMatchObject({ success: true, data: { total: 60 } });
    expect(await completeTakeAway(f.ids.company, orderId)).toMatchObject({
      success: true,
      data: { status: "COMPLETED" },
    });
    expect(await db().delivery.count({ where: { orderId } })).toBe(0);
    expect(await f.stockA()).toBe(8);
    const payload = await documentPayload(orderId);
    expect(shipping(payload)).toHaveLength(0);
    expect(payload.totales.total_venta).toBe(60);
  });

  test("R5 envío gratis con factura: total de productos y payload sin Envío", async () => {
    const orderId = await f.createOrder({
      delivery: { ...f.defaultDelivery, fee: 0 },
    });
    const paid = await f.pay(orderId, { receipt: f.invoiceReceipt });
    expect(paid).toMatchObject({ success: true, data: { total: 50 } });
    const payload = await documentPayload(orderId);
    expect(payload.tipo_documento).toBe("01");
    expect(shipping(payload)).toHaveLength(0);
    expect(payload.items).toHaveLength(2);
    expect(payload.totales).toMatchObject({
      total_exoneradas: 50,
      total_venta: 50,
    });
  });

  test("R6 reintentos de cobro, despacho y entrega no duplican filas ni stock", async () => {
    await f.setStockA(10);
    const orderId = await f.createOrder({});
    const input = await f.paymentInput(orderId);
    const cashier = f.user("cashier");
    const first = await payFulfillmentOrder(cashier, input);
    expect(first.success).toBe(true);
    expect((await transition(orderId, "DISPATCH")).success).toBe(true);
    const delivered = await transition(orderId, "DELIVER");
    expect(delivered.success).toBe(true);
    const before = await rows(orderId);
    const audit = await db().delivery.findUniqueOrThrow({ where: { orderId } });
    const stock = await f.stockA();

    expect(await payFulfillmentOrder(cashier, input)).toEqual(first);
    // El despacho repetido tras la entrega devuelve éxito sin retroceder.
    expect(await transition(orderId, "DISPATCH")).toMatchObject({
      success: true,
      data: { orderId, status: "DELIVERED" },
    });
    expect(await transition(orderId, "DELIVER")).toEqual(delivered);

    expect(await rows(orderId)).toEqual(before);
    expect(
      await db().delivery.findUniqueOrThrow({ where: { orderId } }),
    ).toEqual(audit);
    expect(await f.stockA()).toBe(stock);
    expect(stock).toBe(9);
  });
});
