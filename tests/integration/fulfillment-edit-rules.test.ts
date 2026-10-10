import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  cancelDocument: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSession: mocks.getSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/kitchen/notifications", () => ({
  notifyPrintJobAvailable: vi.fn(),
}));
vi.mock("@/document/factpro/gateway", () => ({
  default: () => ({ cancelDocument: mocks.cancelDocument }),
}));

import prisma from "@/lib/prisma";
import { submitFulfillmentRound } from "@/order/rounds/fulfillment-repository";
import { persistRoundItemCancellation } from "@/order/rounds/db_repository";
import {
  confirmFulfillmentRound,
  cancelFulfillmentRoundItem,
} from "@/order/rounds/fulfillment-actions";
import * as deliveryActions from "@/delivery/actions";
import * as deliveryRepository from "@/delivery/db_repository";
import { completeTakeAway, transitionDelivery } from "@/delivery/db_repository";
import { payFulfillmentOrder } from "@/order/fulfillment-payment-repository";
import { cancelOrder } from "@/order/actions";
import cancel from "@/order/use-cases/cancel";
import {
  find as findOrder,
  update as updateOrder,
} from "@/order/db_repository";
import { canCancelOrder } from "@/order/use-cases/can-cancel-order";
import { findBillingDocumentFor } from "@/document/db_repository";

const suffix = randomUUID();
const ids = {
  company: randomUUID(),
  company2: randomUUID(),
  admin: randomUUID(),
  cashier: randomUUID(),
  seller: randomUUID(),
  waiter: randomUUID(),
  admin2: randomUUID(),
  cashShift: randomUUID(),
  client: randomUUID(),
  printer: randomUUID(),
  hot: randomUUID(),
  cold: randomUUID(),
  productA: randomUUID(),
  productB: randomUUID(),
  retailOrder: randomUUID(),
  retailDocument: randomUUID(),
};
const orderIds: string[] = [];

type Role = "ADMIN" | "CASHIER" | "SELLER" | "WAITER";
const users = {
  admin: { id: ids.admin, companyId: ids.company, role: "ADMIN" as Role },
  cashier: { id: ids.cashier, companyId: ids.company, role: "CASHIER" as Role },
  seller: { id: ids.seller, companyId: ids.company, role: "SELLER" as Role },
  waiter: { id: ids.waiter, companyId: ids.company, role: "WAITER" as Role },
  admin2: { id: ids.admin2, companyId: ids.company2, role: "ADMIN" as Role },
};
const sessionUser = (user: (typeof users)[keyof typeof users]) => ({
  ...user,
  name: user.role,
  email: `${user.id}@example.test`,
  active: true,
});
const actAs = (user: (typeof users)[keyof typeof users]) =>
  mocks.getSession.mockResolvedValue({ user: sessionUser(user) });

beforeAll(async () => {
  const db = prisma();
  await db.company.createMany({
    data: [
      { id: ids.company, address: "QA" },
      { id: ids.company2, address: "QA 2" },
    ],
  });
  await db.companyFeature.createMany({
    data: [ids.company, ids.company2].map((companyId) => ({
      companyId,
      key: "restaurants",
      enabled: true,
    })),
  });
  await db.user.createMany({
    data: Object.entries(users).map(([name, user]) => ({
      id: user.id,
      companyId: user.companyId,
      email: `edit-rules-${name}-${suffix}@example.test`,
      password: "test",
      name,
      role: user.role,
    })),
  });
  await db.cashShift.create({
    data: {
      id: ids.cashShift,
      userId: ids.admin,
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
        name: "Cocina",
        printerId: ids.printer,
      },
      { id: ids.cold, companyId: ids.company, name: "Barra" },
    ],
  });
  await db.product.createMany({
    data: [
      {
        id: ids.productA,
        companyId: ids.company,
        name: "Producto A",
        description: "",
        price: 30,
        productType: "SINGLE_PRODUCT",
        unitType: "UNIT",
        stock: 1000,
        purchasePrice: 10,
        kitchenId: ids.hot,
      },
      {
        id: ids.productB,
        companyId: ids.company,
        name: "Producto B",
        description: "",
        price: 20,
        productType: "DISH",
        kitchenId: ids.cold,
      },
    ],
  });
});

afterAll(async () => {
  const db = prisma();
  const all = [...orderIds, ids.retailOrder];
  await db.kitchetTicketPrintJob.deleteMany({
    where: { companyId: ids.company },
  });
  await db.kitchenTicket.deleteMany({
    where: { orderRound: { orderId: { in: all } } },
  });
  await db.orderItemCancellation.deleteMany({
    where: { orderRoundItem: { orderRound: { orderId: { in: all } } } },
  });
  await db.orderRoundItem.deleteMany({
    where: { orderRound: { orderId: { in: all } } },
  });
  await db.stockTransfer.deleteMany({ where: { companyId: ids.company } });
  await db.documentTaxDispatch.deleteMany({
    where: { companyId: ids.company },
  });
  await db.document.deleteMany({ where: { orderId: { in: all } } });
  await db.payment.deleteMany({ where: { orderId: { in: all } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: all } } });
  await db.orderRound.deleteMany({ where: { orderId: { in: all } } });
  await db.delivery.deleteMany({ where: { orderId: { in: all } } });
  await db.order.deleteMany({ where: { id: { in: all } } });
  await db.cashShift.delete({ where: { id: ids.cashShift } });
  await db.product.deleteMany({ where: { companyId: ids.company } });
  await db.kitchen.deleteMany({ where: { companyId: ids.company } });
  await db.printer.delete({ where: { id: ids.printer } });
  await db.printClient.delete({ where: { id: ids.client } });
  await db.companyFeature.deleteMany({
    where: { companyId: { in: [ids.company, ids.company2] } },
  });
  await db.user.deleteMany({
    where: { companyId: { in: [ids.company, ids.company2] } },
  });
  await db.company.deleteMany({
    where: { id: { in: [ids.company, ids.company2] } },
  });
});

beforeEach(() => {
  actAs(users.admin);
  mocks.cancelDocument.mockReset();
});

type Line = { productId: string; quantity: number };

async function createOrder(orderType: "DELIVERY" | "TAKE_AWAY", items: Line[]) {
  const result = await submitFulfillmentRound(ids.company, ids.admin, {
    roundId: randomUUID(),
    orderType,
    items,
  });
  if (!result.success) throw new Error(result.message);
  orderIds.push(result.data.orderId);
  return result.data.orderId;
}

const addRound = (
  orderId: string,
  orderType: "DELIVERY" | "TAKE_AWAY",
  items: Line[],
  userId = ids.admin,
) =>
  submitFulfillmentRound(ids.company, userId, {
    orderId,
    roundId: randomUUID(),
    orderType,
    items,
  });

async function roundItemOf(orderId: string, productId: string) {
  return prisma().orderRoundItem.findFirstOrThrow({
    where: { orderRound: { orderId }, productId },
  });
}

const retire = (
  orderRoundItemId: string,
  quantity: number,
  cancellationId = randomUUID(),
) =>
  persistRoundItemCancellation({
    cancellationId,
    orderRoundItemId,
    quantity,
    reason: "Cliente cambió de opinión",
    companyId: ids.company,
    userId: ids.admin,
    isAdmin: true,
  });

const stockOf = async (productId: string) =>
  (
    await prisma().product.findUniqueOrThrow({ where: { id: productId } })
  ).stock?.toNumber();

async function snapshot(orderId: string) {
  const db = prisma();
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      delivery: true,
      orderItems: { orderBy: { id: "asc" } },
    },
  });
  return JSON.stringify({
    order: {
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total.toString(),
      updatedAt: order.updatedAt,
    },
    delivery: order.delivery?.status ?? null,
    items: order.orderItems.map((item) => [
      item.id,
      item.quantity.toString(),
      item.total.toString(),
    ]),
    rounds: await db.orderRound.count({ where: { orderId } }),
    tickets: await db.kitchenTicket.count({
      where: { orderRound: { orderId } },
    }),
    jobs: await db.kitchetTicketPrintJob.count({
      where: { kitchenTicket: { orderRound: { orderId } } },
    }),
    cancellations: await db.orderItemCancellation.count({
      where: { orderRoundItem: { orderRound: { orderId } } },
    }),
    documents: await db.document.count({ where: { orderId } }),
    payments: await db.payment.count({ where: { orderId } }),
    transfers: await db.stockTransfer.count({
      where: {
        companyId: ids.company,
        data: { path: ["orderItemId"], string_contains: "" },
        value: { not: 0 },
        productId: ids.productA,
      },
    }),
    stockA: await stockOf(ids.productA),
  });
}

async function pay(orderId: string, user = users.admin) {
  const order = await prisma().order.findUniqueOrThrow({
    where: { id: orderId },
  });
  const result = await payFulfillmentOrder(sessionUser(user), {
    orderId,
    orderVersion: order.updatedAt.toISOString(),
    expectedTotal: order.total.toNumber(),
    cashShiftId: ids.cashShift,
    method: "debit_card",
    receipt: { documentType: "ticket" },
  });
  if (!result.success) throw new Error(result.message);
}

async function insertDocument(orderId: string) {
  await prisma().document.create({
    data: {
      orderId,
      companyId: ids.company,
      netTotal: 0,
      total: 0,
      documentType: "TICKET",
      series: `NV${randomUUID().slice(0, 4)}`,
      number: 1,
      dateOfIssue: new Date(),
      status: "REGISTERED",
    },
  });
}

describe("DEL-01 · adiciones a pedidos Para llevar y Delivery", () => {
  test("E1 rechaza adiciones a un Delivery despachado sin cobrar", async () => {
    const orderId = await createOrder("DELIVERY", [
      { productId: ids.productA, quantity: 1 },
    ]);
    expect(
      await transitionDelivery(ids.company, ids.admin, orderId, "DISPATCH"),
    ).toMatchObject({ success: true });
    const before = await snapshot(orderId);

    const result = await addRound(orderId, "DELIVERY", [
      { productId: ids.productA, quantity: 1 },
      { productId: ids.productB, quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    expect(await snapshot(orderId)).toBe(before);
  });

  test("E1 rechaza adiciones a un Delivery entregado", async () => {
    const orderId = await createOrder("DELIVERY", [
      { productId: ids.productA, quantity: 1 },
    ]);
    await prisma().delivery.update({
      where: { orderId },
      data: {
        status: "DELIVERED",
        dispatchedAt: new Date(),
        dispatchedById: ids.admin,
        deliveredAt: new Date(),
        deliveredById: ids.admin,
      },
    });
    const before = await snapshot(orderId);

    expect(
      (
        await addRound(orderId, "DELIVERY", [
          { productId: ids.productA, quantity: 1 },
        ])
      ).success,
    ).toBe(false);
    expect(await snapshot(orderId)).toBe(before);
  });

  test("E2 rechaza adiciones a pedidos cobrados (Delivery y Para llevar)", async () => {
    for (const orderType of ["DELIVERY", "TAKE_AWAY"] as const) {
      const orderId = await createOrder(orderType, [
        { productId: ids.productA, quantity: 1 },
      ]);
      await pay(orderId);
      const before = await snapshot(orderId);
      expect(
        (
          await addRound(orderId, orderType, [
            { productId: ids.productA, quantity: 1 },
          ])
        ).success,
      ).toBe(false);
      expect(await snapshot(orderId)).toBe(before);
    }
  });

  test("E2 el documento local bloquea adiciones aunque el pago siga pendiente", async () => {
    for (const orderType of ["DELIVERY", "TAKE_AWAY"] as const) {
      const orderId = await createOrder(orderType, [
        { productId: ids.productA, quantity: 1 },
      ]);
      await insertDocument(orderId);
      const before = await snapshot(orderId);
      expect(
        (
          await addRound(orderId, orderType, [
            { productId: ids.productA, quantity: 1 },
          ])
        ).success,
      ).toBe(false);
      expect(await snapshot(orderId)).toBe(before);
    }
  });

  test("Delivery pendiente y Para llevar sin cobrar siguen admitiendo adiciones", async () => {
    for (const orderType of ["DELIVERY", "TAKE_AWAY"] as const) {
      const orderId = await createOrder(orderType, [
        { productId: ids.productA, quantity: 1 },
      ]);
      const stock = await stockOf(ids.productA);
      const result = await addRound(orderId, orderType, [
        { productId: ids.productA, quantity: 2 },
      ]);
      expect(result).toMatchObject({ success: true, data: { number: 2 } });
      expect(await stockOf(ids.productA)).toBe(stock! - 2);
      expect(
        (
          await prisma().order.findUniqueOrThrow({ where: { id: orderId } })
        ).total.toNumber(),
      ).toBe(90);
    }
  });
});

describe("DEL-01 · retiro de productos", () => {
  test("E3 rechaza el retiro en un Delivery despachado sin cobrar", async () => {
    const orderId = await createOrder("DELIVERY", [
      { productId: ids.productA, quantity: 2 },
      { productId: ids.productB, quantity: 1 },
    ]);
    await transitionDelivery(ids.company, ids.admin, orderId, "DISPATCH");
    const before = await snapshot(orderId);
    const item = await roundItemOf(orderId, ids.productA);

    const result = await retire(item.id, 1);

    expect(result.success).toBe(false);
    expect(await snapshot(orderId)).toBe(before);
  });

  test("el documento local bloquea el retiro aunque el pago siga pendiente", async () => {
    for (const orderType of ["DELIVERY", "TAKE_AWAY"] as const) {
      const orderId = await createOrder(orderType, [
        { productId: ids.productA, quantity: 2 },
        { productId: ids.productB, quantity: 1 },
      ]);
      await insertDocument(orderId);
      const before = await snapshot(orderId);
      const item = await roundItemOf(orderId, ids.productA);
      expect((await retire(item.id, 1)).success).toBe(false);
      expect(await snapshot(orderId)).toBe(before);
    }
  });

  test("E4 rechaza retirar la última cantidad activa", async () => {
    for (const orderType of ["DELIVERY", "TAKE_AWAY"] as const) {
      const single = await createOrder(orderType, [
        { productId: ids.productA, quantity: 1 },
      ]);
      const before = await snapshot(single);
      const item = await roundItemOf(single, ids.productA);
      expect(await retire(item.id, 1)).toMatchObject({
        success: false,
        message: expect.stringContaining("al menos un producto"),
      });
      expect(await snapshot(single)).toBe(before);

      const twoUnits = await createOrder(orderType, [
        { productId: ids.productA, quantity: 2 },
      ]);
      const beforeTwo = await snapshot(twoUnits);
      const twoItem = await roundItemOf(twoUnits, ids.productA);
      expect((await retire(twoItem.id, 2)).success).toBe(false);
      expect(await snapshot(twoUnits)).toBe(beforeTwo);
    }
  });

  test("E4 rechaza dejar el pedido vacío tras retiros sucesivos", async () => {
    const orderId = await createOrder("TAKE_AWAY", [
      { productId: ids.productA, quantity: 1 },
      { productId: ids.productB, quantity: 1 },
    ]);
    const a = await roundItemOf(orderId, ids.productA);
    const b = await roundItemOf(orderId, ids.productB);
    expect((await retire(a.id, 1)).success).toBe(true);
    expect((await retire(b.id, 1)).success).toBe(false);
  });

  test("E5 acepta un retiro parcial, repone stock una sola vez y recalcula el total", async () => {
    const orderId = await createOrder("DELIVERY", [
      { productId: ids.productA, quantity: 2 },
      { productId: ids.productB, quantity: 1 },
    ]);
    const item = await roundItemOf(orderId, ids.productA);
    const stockBefore = await stockOf(ids.productA);
    const cancellationId = randomUUID();

    const result = await retire(item.id, 1, cancellationId);
    expect(result).toMatchObject({ success: true });
    expect(await stockOf(ids.productA)).toBe(stockBefore! + 1);

    // el reintento con el mismo identificador no repone otra vez
    expect((await retire(item.id, 1, cancellationId)).success).toBe(true);
    expect(await stockOf(ids.productA)).toBe(stockBefore! + 1);

    const order = await prisma().order.findUniqueOrThrow({
      where: { id: orderId },
      include: { orderItems: true },
    });
    expect(order.total.toNumber()).toBe(50);
    expect(order.netTotal.toNumber()).toBe(50);
    expect(
      order.orderItems
        .find((i) => i.productId === ids.productA)
        ?.quantity.toNumber(),
    ).toBe(1);
    const compensations = await prisma().stockTransfer.findMany({
      where: {
        companyId: ids.company,
        data: { path: ["cancellationId"], equals: cancellationId },
      },
    });
    expect(compensations).toHaveLength(1);
    expect(compensations[0].value.toNumber()).toBe(1);
    expect(compensations[0].status).toBe("EXECUTED");
  });

  test("retirar una línea completa conservando otra repone todo su consumo", async () => {
    const orderId = await createOrder("TAKE_AWAY", [
      { productId: ids.productA, quantity: 3 },
      { productId: ids.productB, quantity: 1 },
    ]);
    const item = await roundItemOf(orderId, ids.productA);
    const stockBefore = await stockOf(ids.productA);
    expect((await retire(item.id, 3)).success).toBe(true);
    expect(await stockOf(ids.productA)).toBe(stockBefore! + 3);
    expect(
      (
        await prisma().order.findUniqueOrThrow({ where: { id: orderId } })
      ).total.toNumber(),
    ).toBe(20);
  });

  test("retirar un producto sin control de stock no mueve inventario", async () => {
    const orderId = await createOrder("TAKE_AWAY", [
      { productId: ids.productA, quantity: 1 },
      { productId: ids.productB, quantity: 2 },
    ]);
    const item = await roundItemOf(orderId, ids.productB);
    const stockBefore = await stockOf(ids.productA);
    expect((await retire(item.id, 1)).success).toBe(true);
    expect(await stockOf(ids.productA)).toBe(stockBefore);
    expect(
      await prisma().stockTransfer.count({
        where: {
          companyId: ids.company,
          productId: ids.productB,
        },
      }),
    ).toBe(0);
  });
});

describe("DEL-01 · cancelación retirada", () => {
  test("E6 no existe la acción ni el repositorio de cancelación de pedido", () => {
    expect(deliveryActions).not.toHaveProperty("cancelFulfillment");
    expect(deliveryRepository).not.toHaveProperty("cancelFulfillmentOrder");
  });

  test("E7 la anulación general rechaza Delivery y Para llevar completados", async () => {
    for (const orderType of ["DELIVERY", "TAKE_AWAY"] as const) {
      const orderId = await createOrder(orderType, [
        { productId: ids.productA, quantity: 1 },
      ]);
      await pay(orderId);
      if (orderType === "DELIVERY") {
        await transitionDelivery(ids.company, ids.admin, orderId, "DISPATCH");
        await transitionDelivery(ids.company, ids.admin, orderId, "DELIVER");
      } else {
        await completeTakeAway(ids.company, orderId);
      }
      const order = await prisma().order.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(order.status).toBe("COMPLETED");
      const before = await snapshot(orderId);
      const documentBefore = await prisma().document.findFirstOrThrow({
        where: { orderId },
      });

      // acción de anulación general
      const action = await cancelOrder(orderId, "Cliente llamó");
      expect(action.success).toBe(false);

      // elegibilidad con los datos reales del servidor
      const found = await findOrder(orderId, ids.company);
      const document = await findBillingDocumentFor(orderId, ids.company);
      expect(found.success && document.success).toBe(true);
      if (found.success && document.success) {
        expect(found.data.orderType).toBe(orderType);
        expect(
          canCancelOrder({
            hasPermission: true,
            orderStatus: found.data.status,
            paymentStatus: found.data.paymentStatus,
            hasDishProduct: found.data.hasDishProduct ?? false,
            documentStatus: document.data.status,
            orderCreatedAt: found.data.createdAt,
            orderType: found.data.orderType,
          }),
        ).toBe(false);

        // caso de uso de anulación
        expect(
          (await cancel(found.data, document.data, "Cliente llamó")).success,
        ).toBe(false);

        // escritura efectiva
        expect(
          (
            await updateOrder({
              ...found.data,
              status: "cancelled",
              cancellationReason: "Cliente llamó",
            })
          ).success,
        ).toBe(false);
      }

      expect(mocks.cancelDocument).not.toHaveBeenCalled();
      expect(await snapshot(orderId)).toBe(before);
      expect(
        await prisma().document.findFirstOrThrow({ where: { orderId } }),
      ).toMatchObject({
        status: documentBefore.status,
        cancellationReason: documentBefore.cancellationReason,
      });
    }
  });

  test("E7 la escritura efectiva rechaza cancelar pedidos aún pendientes", async () => {
    const orderId = await createOrder("DELIVERY", [
      { productId: ids.productA, quantity: 1 },
    ]);
    const found = await findOrder(orderId, ids.company);
    expect(found.success).toBe(true);
    if (!found.success) return;
    expect(
      (await updateOrder({ ...found.data, status: "cancelled" })).success,
    ).toBe(false);
    expect(
      (await prisma().order.findUniqueOrThrow({ where: { id: orderId } }))
        .status,
    ).toBe("PENDING");
  });

  test("E8 una venta retail elegible sigue pudiendo anularse", async () => {
    const db = prisma();
    await db.order.create({
      data: {
        id: ids.retailOrder,
        companyId: ids.company,
        sellerId: ids.admin,
        cashShiftId: ids.cashShift,
        orderType: "RETAIL",
        status: "COMPLETED",
        paymentStatus: "PAID",
        discountAmount: 0,
        netTotal: 30,
        total: 30,
        documentType: "ticket",
      },
    });
    await db.document.create({
      data: {
        id: ids.retailDocument,
        orderId: ids.retailOrder,
        companyId: ids.company,
        netTotal: 30,
        total: 30,
        documentType: "TICKET",
        series: "NV99",
        number: 1,
        dateOfIssue: new Date(),
        status: "REGISTERED",
      },
    });
    mocks.cancelDocument.mockImplementation(async (document) => ({
      success: true,
      data: { ...document, status: "cancelled" },
    }));

    const result = await cancelOrder(ids.retailOrder, "Duplicada");

    expect(result, JSON.stringify(result)).toMatchObject({ success: true });
    expect(
      await db.order.findUniqueOrThrow({ where: { id: ids.retailOrder } }),
    ).toMatchObject({ status: "CANCELLED", cancellationReason: "Duplicada" });
    expect(mocks.cancelDocument).toHaveBeenCalledTimes(1);
  });
});

describe("DEL-01 · concurrencia", () => {
  test("X1 un despacho concurrente con una adición produce un único resultado coherente", async () => {
    const outcomes = { addWon: 0, dispatchWon: 0 };
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const orderId = await createOrder("DELIVERY", [
        { productId: ids.productA, quantity: 1 },
      ]);
      const stockBefore = await stockOf(ids.productA);

      const [added, dispatched] = await Promise.all([
        addRound(orderId, "DELIVERY", [
          { productId: ids.productA, quantity: 1 },
        ]),
        transitionDelivery(ids.company, ids.admin, orderId, "DISPATCH"),
      ]);

      const delivery = await prisma().delivery.findUniqueOrThrow({
        where: { orderId },
      });
      const rounds = await prisma().orderRound.count({ where: { orderId } });
      expect(dispatched.success, JSON.stringify(dispatched)).toBe(true);
      expect(delivery.status).toBe("DISPATCHED");

      if (added.success) {
        outcomes.addWon += 1;
        expect(rounds).toBe(2);
        expect(await stockOf(ids.productA)).toBe(stockBefore! - 1);
        // la ronda se confirmó antes del despacho: su transacción tomó el
        // bloqueo del pedido primero (los xid se asignan al primer bloqueo)
        const [{ round_xid, delivery_xid }] = await prisma().$queryRaw<
          Array<{ round_xid: bigint; delivery_xid: bigint }>
        >`SELECT
            (SELECT xmin::text::bigint FROM "OrderRound" WHERE "orderId" = ${orderId} AND number = 2) AS round_xid,
            (SELECT xmin::text::bigint FROM "Delivery" WHERE "orderId" = ${orderId}) AS delivery_xid`;
        expect(round_xid < delivery_xid).toBe(true);
        const order = await prisma().order.findUniqueOrThrow({
          where: { id: orderId },
        });
        expect(order.total.toNumber()).toBe(60);
      } else {
        outcomes.dispatchWon += 1;
        expect(rounds).toBe(1);
        expect(await stockOf(ids.productA)).toBe(stockBefore);
      }

      // tras el despacho, ninguna adición posterior es admitida
      expect(
        (
          await addRound(orderId, "DELIVERY", [
            { productId: ids.productA, quantity: 1 },
          ])
        ).success,
      ).toBe(false);
    }
    expect(outcomes.addWon + outcomes.dispatchWon).toBe(10);
  });

  test("X6 dos retiros simultáneos sobre líneas distintas: queda al menos 1", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const orderId = await createOrder("TAKE_AWAY", [
        { productId: ids.productA, quantity: 1 },
        { productId: ids.productB, quantity: 1 },
      ]);
      const a = await roundItemOf(orderId, ids.productA);
      const b = await roundItemOf(orderId, ids.productB);
      const stockBefore = await stockOf(ids.productA);

      const results = await Promise.all([retire(a.id, 1), retire(b.id, 1)]);

      expect(results.filter((r) => r.success)).toHaveLength(1);
      const rows = await prisma().orderItem.findMany({ where: { orderId } });
      expect(rows.reduce((sum, row) => sum + row.quantity.toNumber(), 0)).toBe(
        1,
      );
      expect(
        (
          await prisma().order.findUniqueOrThrow({ where: { id: orderId } })
        ).total.toNumber(),
      ).toBeGreaterThan(0);
      const aRetired = results[0].success;
      expect(await stockOf(ids.productA)).toBe(
        aRetired ? stockBefore! + 1 : stockBefore,
      );
    }
  });

  test("X6 dos retiros de la misma línea que dejarían el pedido vacío: solo uno se acepta", async () => {
    const orderId = await createOrder("DELIVERY", [
      { productId: ids.productA, quantity: 2 },
    ]);
    const item = await roundItemOf(orderId, ids.productA);

    const results = await Promise.all([retire(item.id, 1), retire(item.id, 1)]);

    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(
      (
        await prisma().orderItem.findFirstOrThrow({ where: { orderId } })
      ).quantity.toNumber(),
    ).toBe(1);
  });
});

describe("DEL-01 · seguridad de adiciones y retiros", () => {
  test("S1 otra empresa no puede agregar ni retirar productos del pedido", async () => {
    const orderId = await createOrder("DELIVERY", [
      { productId: ids.productA, quantity: 2 },
      { productId: ids.productB, quantity: 1 },
    ]);
    const item = await roundItemOf(orderId, ids.productA);
    const before = await snapshot(orderId);
    actAs(users.admin2);

    const added = await confirmFulfillmentRound({
      orderId,
      roundId: randomUUID(),
      orderType: "DELIVERY",
      items: [{ productId: ids.productA, quantity: 1 }],
    });
    const retired = await cancelFulfillmentRoundItem({
      cancellationId: randomUUID(),
      orderRoundItemId: item.id,
      quantity: 1,
      reason: "x",
    });

    expect(added.success).toBe(false);
    expect(retired.success).toBe(false);
    for (const result of [added, retired]) {
      if (result.success) continue;
      expect(result.message).not.toContain(ids.company);
      expect(result.message).not.toContain(orderId);
    }
    expect(await snapshot(orderId)).toBe(before);
  });

  test("S2 WAITER no puede agregar ni retirar productos", async () => {
    const orderId = await createOrder("TAKE_AWAY", [
      { productId: ids.productA, quantity: 2 },
      { productId: ids.productB, quantity: 1 },
    ]);
    const item = await roundItemOf(orderId, ids.productA);
    const before = await snapshot(orderId);
    actAs(users.waiter);

    const added = await confirmFulfillmentRound({
      orderId,
      roundId: randomUUID(),
      orderType: "TAKE_AWAY",
      items: [{ productId: ids.productA, quantity: 1 }],
    });
    const retired = await cancelFulfillmentRoundItem({
      cancellationId: randomUUID(),
      orderRoundItemId: item.id,
      quantity: 1,
    });

    expect(added).toMatchObject({ success: false, type: "AuthorizationError" });
    expect(retired).toMatchObject({
      success: false,
      type: "AuthorizationError",
    });
    expect(await snapshot(orderId)).toBe(before);
  });

  test("las acciones aplican las nuevas reglas de despacho al SELLER", async () => {
    const orderId = await createOrder("DELIVERY", [
      { productId: ids.productA, quantity: 2 },
      { productId: ids.productB, quantity: 1 },
    ]);
    const item = await roundItemOf(orderId, ids.productA);
    actAs(users.seller);
    expect(
      (
        await confirmFulfillmentRound({
          orderId,
          roundId: randomUUID(),
          orderType: "DELIVERY",
          items: [{ productId: ids.productB, quantity: 1 }],
        })
      ).success,
    ).toBe(true);

    await transitionDelivery(ids.company, ids.seller, orderId, "DISPATCH");
    const before = await snapshot(orderId);
    expect(
      (
        await confirmFulfillmentRound({
          orderId,
          roundId: randomUUID(),
          orderType: "DELIVERY",
          items: [{ productId: ids.productB, quantity: 1 }],
        })
      ).success,
    ).toBe(false);
    actAs(users.admin);
    expect(
      (
        await cancelFulfillmentRoundItem({
          cancellationId: randomUUID(),
          orderRoundItemId: item.id,
          quantity: 1,
        })
      ).success,
    ).toBe(false);
    expect(await snapshot(orderId)).toBe(before);
  });
});
