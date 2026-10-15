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
  broadcast: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSession: mocks.getSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/realtime/config", () => ({
  getRealtimeProvider: async () => ({ broadcast: mocks.broadcast }),
}));

import prisma from "@/lib/prisma";
import { submitOrderRound } from "@/order/rounds/db_repository";
import { updateTableDraft } from "@/table/draft-repository";
import { confirmTablePayment } from "@/table/payment-actions";
import { deliverDelivery, dispatchDelivery } from "@/delivery/actions";
import {
  listUnpaidFulfillmentOrders,
  openServiceSession,
} from "@/delivery/db_repository";
import {
  closeCashShift,
  getUnpaidFulfillmentOrders,
} from "@/cash-shift/components/actions";
import { findCashShift } from "@/cash-shift/db_repository";
import type { OpenCashShift } from "@/cash-shift/types";
import {
  findDashboardKpis,
  findRecentSales,
  findPaymentBreakdown,
  findSalesTrend,
} from "@/dashboard/db_repository";
import {
  findSalesReportRows,
  countSalesReportRows,
} from "@/sale_report/db_repository";
import { getMany, getTotal } from "@/document/db_repository";

const suffix = randomUUID();
const ids = {
  company: randomUUID(),
  otherCompany: randomUUID(),
  admin: randomUUID(),
  otherAdmin: randomUUID(),
  otherOrder: randomUUID(),
  waiter: randomUUID(),
  cashShift: randomUUID(),
  cashShift2: randomUUID(),
  client: randomUUID(),
  printer: randomUUID(),
  kitchen: randomUUID(),
  bar: randomUUID(),
  productA: randomUUID(),
  productB: randomUUID(),
  productC: randomUUID(),
};
const orderIds: string[] = [];
const user = (id: string, companyId: string, role: string) => ({
  id,
  companyId,
  role,
  name: role,
  email: `del05-${role}-${id}@example.test`,
  active: true,
});
const admin = user(ids.admin, ids.company, "ADMIN");
const otherAdmin = user(ids.otherAdmin, ids.otherCompany, "ADMIN");
const waiter = user(ids.waiter, ids.company, "WAITER");

const deliveryData = (name: string) => ({
  name,
  phone: "987654321",
  address: "Av. Los Olivos 123, Lima",
  reference: null,
  fee: 5,
});

const sessionIds = new Map<string, string>();

/** Abre la sesión sin mesa y, salvo `empty`, envía una ronda con B. */
async function create(
  orderType: "DELIVERY" | "TAKE_AWAY",
  name = "Maria Quispe",
  empty = false,
) {
  const opened = await openServiceSession({
    companyId: ids.company,
    userId: ids.admin,
    delivery: orderType === "DELIVERY" ? deliveryData(name) : null,
  });
  if (!opened.success) throw new Error(opened.message);
  const { sessionId } = opened.data;
  const order = await prisma().order.findFirstOrThrow({
    where: { tableSessionId: sessionId },
  });
  orderIds.push(order.id);
  sessionIds.set(order.id, sessionId);
  if (empty) return order.id;
  const items = [{ productId: ids.productB, quantity: 1 }];
  const saved = await updateTableDraft({
    companyId: ids.company,
    userId: ids.admin,
    sessionId,
    revision: 0,
    operation: "save",
    items,
  });
  if (!saved.success) throw new Error(saved.message);
  const sent = await submitOrderRound({
    companyId: ids.company,
    userId: ids.admin,
    roundId: randomUUID(),
    items,
    sessionId,
    draftRevision: saved.data.revision,
  });
  if (!sent.success) throw new Error(sent.message);
  return order.id;
}

async function paymentInput(orderId: string, cashShiftId: string) {
  const order = await prisma().order.findUniqueOrThrow({
    where: { id: orderId },
    include: { tableSession: true },
  });
  return {
    sessionId: order.tableSessionId!,
    revision: order.tableSession!.draftRevision,
    orderVersion: order.updatedAt.toISOString(),
    expectedTotal: order.total.toNumber(),
    cashShiftId,
    method: "cash" as const,
    cashReceived: 100,
    receipt: { documentType: "ticket" as const },
  };
}

async function pay(orderId: string, cashShiftId: string) {
  const paid = await confirmTablePayment(
    await paymentInput(orderId, cashShiftId),
  );
  expect(paid.success, JSON.stringify(paid)).toBe(true);
}

beforeAll(async () => {
  const db = prisma();
  await db.company.create({ data: { id: ids.company, address: "QA" } });
  await db.companyFeature.create({
    data: { companyId: ids.company, key: "restaurants", enabled: true },
  });
  await db.company.create({ data: { id: ids.otherCompany, address: "QA2" } });
  await db.companyFeature.create({
    data: { companyId: ids.otherCompany, key: "restaurants", enabled: true },
  });
  for (const u of [admin, otherAdmin, waiter])
    await db.user.create({
      data: {
        id: u.id,
        companyId: u.companyId,
        email: u.email,
        password: "test",
        name: u.name,
        role: u.role as "ADMIN" | "WAITER",
      },
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
        id: ids.kitchen,
        companyId: ids.company,
        name: "Cocina",
        printerId: ids.printer,
      },
      { id: ids.bar, companyId: ids.company, name: "Barra" },
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
        kitchenId: ids.kitchen,
      },
      {
        id: ids.productB,
        companyId: ids.company,
        name: "Producto B",
        description: "",
        price: 20,
        productType: "DISH",
        kitchenId: ids.bar,
      },
      {
        id: ids.productC,
        companyId: ids.company,
        name: "Producto C",
        description: "",
        price: 15,
        productType: "DISH",
      },
    ],
  });
  // Pedido propio de otra empresa, sin cobrar: nunca debe aparecer.
  await db.order.create({
    data: {
      id: ids.otherOrder,
      companyId: ids.otherCompany,
      orderType: "DELIVERY",
      status: "PENDING",
      paymentStatus: "PENDING",
      discountAmount: 0,
      netTotal: 20,
      total: 20,
      orderItems: {
        create: {
          productId: ids.productB,
          productPrice: 20,
          quantity: 1,
          netTotal: 20,
          discountAmount: 0,
          total: 20,
        },
      },
      delivery: {
        create: {
          ...deliveryData("Cliente Ajeno"),
          createdById: ids.otherAdmin,
        },
      },
    },
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
  await db.tableSession.deleteMany({ where: { companyId: ids.company } });
  await db.orderItem.deleteMany({ where: { orderId: ids.otherOrder } });
  await db.delivery.deleteMany({ where: { orderId: ids.otherOrder } });
  await db.order.deleteMany({ where: { companyId: ids.otherCompany } });
  await db.cashShift.deleteMany({
    where: { id: { in: [ids.cashShift, ids.cashShift2] } },
  });
  await db.product.deleteMany({ where: { companyId: ids.company } });
  await db.kitchen.deleteMany({ where: { companyId: ids.company } });
  await db.printer.delete({ where: { id: ids.printer } });
  await db.printClient.delete({ where: { id: ids.client } });
  await db.companyFeature.deleteMany({ where: { companyId: ids.company } });
  await db.companyFeature.deleteMany({
    where: { companyId: ids.otherCompany },
  });
  await db.user.deleteMany({
    where: { id: { in: [ids.admin, ids.otherAdmin, ids.waiter] } },
  });
  await db.company.deleteMany({
    where: { id: { in: [ids.company, ids.otherCompany] } },
  });
});

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ user: admin });
  mocks.broadcast.mockReset();
  mocks.broadcast.mockResolvedValue(undefined);
});

const dayRange = () => ({
  startDate: new Date(Date.now() - 60 * 60 * 1000),
  endDate: new Date(Date.now() + 60 * 60 * 1000),
});

async function reportTotals(range = dayRange()) {
  const { startDate, endDate } = range;
  const dashboard = {
    companyId: ids.company,
    period: "today" as const,
    startDate,
    endDate,
    bucket: "day" as const,
    timezone: "America/Lima",
  };
  const kpis = await findDashboardKpis(dashboard);
  const trend = await findSalesTrend(dashboard);
  const breakdown = await findPaymentBreakdown(dashboard);
  const salesQuery = {
    companyId: ids.company,
    startDate,
    endDate,
    status: "paid" as const,
    sellerMode: "all" as const,
  };
  const rows = await findSalesReportRows(salesQuery);
  const count = await countSalesReportRows(salesQuery);
  const documentQuery = {
    companyId: ids.company,
    startDate,
    endDate,
    ticket: true,
    orderStatus: "paid" as const,
  };
  const documents = await getMany(documentQuery);
  const documentCount = await getTotal(documentQuery);
  if (
    !kpis.success ||
    !trend.success ||
    !breakdown.success ||
    !rows.success ||
    !count.success ||
    !documents.success ||
    !documentCount.success
  )
    throw new Error("consulta de reportes fallida");
  return {
    dashboardTotal: kpis.data.paidSalesTotal,
    dashboardCount: kpis.data.paidSalesCount,
    trendTotal: trend.data.reduce((sum, point) => sum + point.total, 0),
    paymentTotal: breakdown.data.reduce((sum, row) => sum + row.total, 0),
    salesRows: rows.data.map((row) => row.orderId).sort(),
    salesCount: count.data,
    exportedOrders: documents.data.map((doc) => doc.orderId).sort(),
    exportedCount: documentCount.data,
  };
}

let dispatched: {
  orderId: string;
  totals: Awaited<ReturnType<typeof reportTotals>>;
};

describe("DEL-05 · caja y reportes", () => {
  let delivery1: string;
  let takeAway: string;
  let closedShiftSnapshot: string;

  test("K1 la consulta devuelve los pendientes de la empresa (de cualquier turno) con cliente, total y estado", async () => {
    delivery1 = await create("DELIVERY", "Maria Quispe");
    takeAway = await create("TAKE_AWAY");
    // Pedido de un turno anterior: creado ayer, sigue sin cobrar.
    await prisma().order.update({
      where: { id: takeAway },
      data: { createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000) },
    });
    // Excluidos: ya cobrado, cancelado y salón/retail no aplican.
    const paid = await create("DELIVERY", "Ya Pagado");
    await pay(paid, ids.cashShift);
    const cancelled = await create("TAKE_AWAY");
    await prisma().order.update({
      where: { id: cancelled },
      data: { status: "CANCELLED" },
    });
    // Una sesión abierta sin productos aún no es un pedido.
    await create("DELIVERY", "Sin Productos", true);

    const result = await listUnpaidFulfillmentOrders(ids.company);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.map((o) => o.orderId)).toEqual([takeAway, delivery1]);
    expect(result.data[0]).toMatchObject({
      sessionId: sessionIds.get(takeAway),
      orderType: "TAKE_AWAY",
      customerLabel: "Para llevar",
      statusLabel: "Pendiente",
      total: 20,
    });
    expect(result.data[1]).toMatchObject({
      sessionId: sessionIds.get(delivery1),
      orderType: "DELIVERY",
      customerLabel: "Maria Quispe",
      statusLabel: "Pendiente",
      total: 25,
    });
    expect(JSON.stringify(result.data)).not.toContain("Cliente Ajeno");
    expect(JSON.stringify(result.data)).not.toContain("987654321");
    expect(JSON.stringify(result.data)).not.toContain("Olivos");

    const other = await listUnpaidFulfillmentOrders(ids.otherCompany);
    expect(other.success && other.data.map((o) => o.orderId)).toEqual([
      ids.otherOrder,
    ]);
  });

  test("K1 la acción usa la empresa de la sesión y exige permiso de caja", async () => {
    const own = await getUnpaidFulfillmentOrders();
    expect(own.success && own.data.map((o) => o.orderId)).toEqual([
      takeAway,
      delivery1,
    ]);

    mocks.getSession.mockResolvedValue({ user: otherAdmin });
    const foreign = await getUnpaidFulfillmentOrders();
    expect(foreign.success && foreign.data.map((o) => o.orderId)).toEqual([
      ids.otherOrder,
    ]);

    mocks.getSession.mockResolvedValue({ user: waiter });
    expect(await getUnpaidFulfillmentOrders()).toMatchObject({
      success: false,
      type: "AuthorizationError",
    });
  });

  test("K2 cerrar la caja con pendientes no se bloquea y deja los pedidos intactos", async () => {
    const before = await prisma().order.findMany({
      where: { id: { in: [delivery1, takeAway] } },
      include: { delivery: true },
      orderBy: { id: "asc" },
    });
    const shift = await findCashShift<OpenCashShift>(ids.cashShift);
    if (!shift.success) throw new Error(shift.message);
    const closed = await closeCashShift(shift.data, 100);
    expect(closed.success, JSON.stringify(closed)).toBe(true);

    const row = await prisma().cashShift.findUniqueOrThrow({
      where: { id: ids.cashShift },
    });
    expect(row.status).toBe("CLOSED");
    const after = await prisma().order.findMany({
      where: { id: { in: [delivery1, takeAway] } },
      include: { delivery: true },
      orderBy: { id: "asc" },
    });
    expect(after).toEqual(before);
    expect(after.every((o) => o.paymentStatus === "PENDING")).toBe(true);
    expect(after.every((o) => o.cashShiftId === null)).toBe(true);
    closedShiftSnapshot = JSON.stringify(await findCashShift(ids.cashShift));
  });

  test("K3 el cobro posterior entra a la caja nueva y el cierre anterior no cambia", async () => {
    await prisma().cashShift.create({
      data: {
        id: ids.cashShift2,
        userId: ids.admin,
        companyId: ids.company,
        initialAmount: 50,
        status: "OPEN",
        openedAt: new Date(),
      },
    });
    // La caja cerrada ya no sirve para cobrar.
    const rejected = await confirmTablePayment(
      await paymentInput(delivery1, ids.cashShift),
    );
    expect(rejected.success).toBe(false);

    await pay(delivery1, ids.cashShift2);

    const payments = await prisma().payment.findMany({
      where: { orderId: delivery1 },
    });
    expect(payments).toHaveLength(1);
    expect(payments[0].cashShiftId).toBe(ids.cashShift2);
    expect(
      (await prisma().order.findUniqueOrThrow({ where: { id: delivery1 } }))
        .cashShiftId,
    ).toBe(ids.cashShift2);
    expect(JSON.stringify(await findCashShift(ids.cashShift))).toBe(
      closedShiftSnapshot,
    );

    const left = await listUnpaidFulfillmentOrders(ids.company);
    expect(left.success && left.data.map((o) => o.orderId)).toEqual([takeAway]);
  });

  test("K4 un Delivery cobrado y despachado aparece una vez en reportes, dashboard y exportación", async () => {
    const baseline = await reportTotals();
    const orderId = await create("DELIVERY", "Pedro Ramos");
    await pay(orderId, ids.cashShift2);
    expect(await dispatchDelivery({ orderId })).toMatchObject({
      success: true,
    });

    const order = await prisma().order.findUniqueOrThrow({
      where: { id: orderId },
      include: { delivery: true },
    });
    expect(order.status).toBe("PENDING");
    expect(order.paymentStatus).toBe("PAID");
    expect(order.delivery?.status).toBe("DISPATCHED");

    const totals = await reportTotals();
    expect(totals.dashboardTotal - baseline.dashboardTotal).toBe(25);
    expect(totals.dashboardCount - baseline.dashboardCount).toBe(1);
    expect(totals.trendTotal - baseline.trendTotal).toBe(25);
    expect(totals.paymentTotal - baseline.paymentTotal).toBe(25);
    expect(totals.salesCount - baseline.salesCount).toBe(1);
    expect(totals.salesRows.filter((id) => id === orderId)).toHaveLength(1);
    expect(totals.exportedCount - baseline.exportedCount).toBe(1);
    expect(totals.exportedOrders.filter((id) => id === orderId)).toHaveLength(
      1,
    );
    // El pedido sin cobrar nunca entra.
    expect(totals.salesRows).not.toContain(takeAway);
    expect(totals.exportedOrders).not.toContain(takeAway);
    dispatched = { orderId, totals };
  });

  test("K5 al entregarlo los totales de reportes no cambian", async () => {
    const { orderId, totals } = dispatched;
    expect(await deliverDelivery({ orderId })).toMatchObject({ success: true });
    expect(
      (await prisma().order.findUniqueOrThrow({ where: { id: orderId } }))
        .status,
    ).toBe("COMPLETED");
    // Cobrado y entregado: la sesión se cierra como una mesa liberada.
    expect(
      await prisma().tableSession.findUniqueOrThrow({
        where: { id: sessionIds.get(orderId) },
      }),
    ).toMatchObject({ status: "CLOSED", current: null });
    expect(await reportTotals()).toEqual(totals);
  });

  test("K4 entre días: creado ayer y cobrado hoy cuenta solo hoy, en las tres vistas", async () => {
    const hour = 60 * 60 * 1000;
    const yesterday = {
      startDate: new Date(Date.now() - 48 * hour),
      endDate: new Date(Date.now() - 12 * hour),
    };
    const todayBefore = await reportTotals();
    const yesterdayBefore = await reportTotals(yesterday);

    const orderId = await create("DELIVERY", "Ana Torres");
    await prisma().order.update({
      where: { id: orderId },
      data: { createdAt: new Date(Date.now() - 36 * hour) },
    });
    await pay(orderId, ids.cashShift2);

    const today = await reportTotals();
    expect(today.dashboardTotal - todayBefore.dashboardTotal).toBe(25);
    expect(today.dashboardCount - todayBefore.dashboardCount).toBe(1);
    expect(today.trendTotal - todayBefore.trendTotal).toBe(25);
    expect(today.paymentTotal - todayBefore.paymentTotal).toBe(25);
    expect(today.salesRows.filter((id) => id === orderId)).toHaveLength(1);
    expect(today.exportedOrders.filter((id) => id === orderId)).toHaveLength(1);

    // Ayer no hubo cobro: ninguna vista lo cuenta.
    expect(await reportTotals(yesterday)).toEqual(yesterdayBefore);
  });

  test("I2 una orden histórica COMPLETED con paymentStatus PENDING sigue en reportes", async () => {
    const historic = randomUUID();
    await prisma().order.create({
      data: {
        id: historic,
        companyId: ids.company,
        orderType: "RETAIL",
        status: "COMPLETED",
        paymentStatus: "PENDING",
        discountAmount: 0,
        netTotal: 40,
        total: 40,
      },
    });
    orderIds.push(historic);
    const totals = await reportTotals();
    expect(totals.salesRows).toContain(historic);
    expect(totals.dashboardTotal).toBeGreaterThanOrEqual(40);
    // Fuera de su fecha de creación no aparece.
    const old = await reportTotals({
      startDate: new Date(Date.now() - 72 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
    });
    expect(old.salesRows).not.toContain(historic);
  });

  test("M3 un Delivery cobrado y por entregar se rotula Cobrado · por entregar", async () => {
    const orderId = await create("DELIVERY", "Luis Paz");
    await pay(orderId, ids.cashShift2);
    const { startDate, endDate } = dayRange();
    const recent = await findRecentSales({
      companyId: ids.company,
      period: "today",
      startDate,
      endDate,
      bucket: "day",
      timezone: "America/Lima",
    });
    if (!recent.success) throw new Error(recent.message);
    expect(recent.data.find((s) => s.orderId === orderId)?.status).toBe(
      "awaiting_delivery",
    );
  });
});
