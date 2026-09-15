import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import { submitFulfillmentRound } from "@/order/rounds/fulfillment-repository";
import { completeTakeAway, transitionDelivery } from "@/delivery/db_repository";
import { payFulfillmentOrder } from "@/order/fulfillment-payment-repository";

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
