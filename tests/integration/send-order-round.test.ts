import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import { submitOrderRound } from "@/order/rounds/db_repository";
import { persistRoundItemCancellation } from "@/order/rounds/db_repository";

const suffix = randomUUID();
const ids = {
  company: randomUUID(),
  user: randomUUID(),
  zone: randomUUID(),
  table: randomUUID(),
  session: randomUUID(),
  order: randomUUID(),
  client: randomUUID(),
  printer: randomUUID(),
  kitchen: randomUUID(),
  dish: randomUUID(),
  service: randomUUID(),
};

beforeAll(async () => {
  const db = prisma();
  await db.company.create({ data: { id: ids.company, address: "QA" } });
  await db.user.create({
    data: {
      id: ids.user,
      companyId: ids.company,
      email: `round-${suffix}@example.test`,
      password: "test",
      name: "Ana",
      role: "WAITER",
    },
  });
  await db.zone.create({
    data: { id: ids.zone, companyId: ids.company, name: "Salón" },
  });
  await db.table.create({
    data: {
      id: ids.table,
      companyId: ids.company,
      zoneId: ids.zone,
      number: 7,
    },
  });
  await db.tableSession.create({
    data: {
      id: ids.session,
      companyId: ids.company,
      tableId: ids.table,
      waiterId: ids.user,
    },
  });
  await db.order.create({
    data: {
      id: ids.order,
      companyId: ids.company,
      tableSessionId: ids.session,
      orderType: "DINE_IN",
      status: "PENDING",
      discountAmount: 0,
      netTotal: 0,
      total: 0,
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
  await db.kitchen.create({
    data: {
      id: ids.kitchen,
      companyId: ids.company,
      name: "Cocina",
      printerId: ids.printer,
    },
  });
  await db.product.createMany({
    data: [
      {
        id: ids.dish,
        companyId: ids.company,
        name: "Lomo",
        description: "",
        price: 25,
        productType: "DISH",
        kitchenId: ids.kitchen,
      },
      {
        id: ids.service,
        companyId: ids.company,
        name: "Cubierto",
        description: "",
        price: 2,
        productType: "SERVICE_PRODUCT",
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
    where: { orderRound: { orderId: ids.order } },
  });
  await db.orderItemCancellation.deleteMany({
    where: { orderRoundItem: { orderRound: { orderId: ids.order } } },
  });
  await db.orderRoundItem.deleteMany({
    where: { orderRound: { orderId: ids.order } },
  });
  await db.orderItem.deleteMany({ where: { orderId: ids.order } });
  await db.orderRound.deleteMany({ where: { orderId: ids.order } });
  await db.order.delete({ where: { id: ids.order } });
  await db.tableSession.delete({ where: { id: ids.session } });
  await db.product.deleteMany({ where: { companyId: ids.company } });
  await db.kitchen.delete({ where: { id: ids.kitchen } });
  await db.printer.delete({ where: { id: ids.printer } });
  await db.printClient.delete({ where: { id: ids.client } });
  await db.table.delete({ where: { id: ids.table } });
  await db.zone.delete({ where: { id: ids.zone } });
  await db.user.delete({ where: { id: ids.user } });
  await db.company.delete({ where: { id: ids.company } });
});

describe("submitOrderRound PostgreSQL integration", () => {
  test("persists separate dishes, snapshots, a ticket, immutable bytes and an idempotent retry", async () => {
    const roundId = randomUUID();
    const request = {
      companyId: ids.company,
      userId: ids.user,
      tableId: ids.table,
      roundId,
      items: [
        { productId: ids.dish, quantity: 2, notes: "Sin cebolla" },
        { productId: ids.dish, quantity: 1, notes: "Término medio" },
        { productId: ids.service, quantity: 1 },
      ],
    };

    const [first, retry] = await Promise.all([
      submitOrderRound(request),
      submitOrderRound(request),
    ]);
    expect(first.success && retry.success).toBe(true);
    if (!first.success || !retry.success) return;
    expect(first.data).toEqual(retry.data);

    const persisted = await prisma().orderRound.findUniqueOrThrow({
      where: { id: roundId },
      include: {
        items: true,
        kitchenTickets: { include: { printJobs: true } },
      },
    });
    expect(persisted.items).toHaveLength(3);
    expect(
      persisted.items.filter((item) => item.productId === ids.dish),
    ).toHaveLength(2);
    expect(persisted.kitchenTickets).toHaveLength(1);
    expect(persisted.kitchenTickets[0].printJobs).toHaveLength(1);
    expect(persisted.kitchenTickets[0].printJobs[0]).toMatchObject({
      printerId: ids.printer,
      requestedById: ids.user,
      isReprint: false,
      status: "PENDING",
      attempts: 0,
    });
    expect(
      persisted.kitchenTickets[0].printJobs[0].content.length,
    ).toBeGreaterThan(20);
  });

  test("serializes different concurrent sends with consecutive numbers", async () => {
    const results = await Promise.all([
      submitOrderRound({
        companyId: ids.company,
        userId: ids.user,
        tableId: ids.table,
        roundId: randomUUID(),
        items: [{ productId: ids.service, quantity: 1 }],
      }),
      submitOrderRound({
        companyId: ids.company,
        userId: ids.user,
        tableId: ids.table,
        roundId: randomUUID(),
        items: [{ productId: ids.service, quantity: 2 }],
      }),
    ]);
    expect(results.every((result) => result.success)).toBe(true);
    expect(
      results.map((result) => (result.success ? result.data.number : 0)).sort(),
    ).toEqual([2, 3]);
  });

  test("serializes concurrent cancellations and recovers the same id", async () => {
    const roundId = randomUUID();
    const sent = await submitOrderRound({
      companyId: ids.company,
      userId: ids.user,
      tableId: ids.table,
      roundId,
      items: [{ productId: ids.service, quantity: 3 }],
    });
    expect(sent.success).toBe(true);
    const item = await prisma().orderRoundItem.findFirstOrThrow({
      where: { orderRoundId: roundId },
    });
    const cancellationId = randomUUID();
    const request = {
      cancellationId,
      orderRoundItemId: item.id,
      quantity: 1,
      reason: "",
      companyId: ids.company,
      userId: ids.user,
      isAdmin: false,
    };
    const duplicate = await Promise.all([
      persistRoundItemCancellation(request),
      persistRoundItemCancellation(request),
    ]);
    expect(
      duplicate.every((result) => result.success),
      JSON.stringify(duplicate),
    ).toBe(true);

    const competing = await Promise.all([
      persistRoundItemCancellation({
        ...request,
        cancellationId: randomUUID(),
        quantity: 2,
      }),
      persistRoundItemCancellation({
        ...request,
        cancellationId: randomUUID(),
        quantity: 2,
      }),
    ]);
    expect(competing.filter((result) => result.success)).toHaveLength(1);
    expect(
      (
        await prisma().orderItem.findUniqueOrThrow({
          where: { id: item.orderItemId },
        })
      ).quantity.toNumber(),
    ).toBe(0);
  });
});
