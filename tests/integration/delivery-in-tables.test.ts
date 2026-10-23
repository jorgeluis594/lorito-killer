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
vi.mock("@/printing/jobs/notifications", () => ({
  notifyPrintJobAvailable: vi.fn(),
}));

import prisma from "@/lib/prisma";
import {
  kitchenTicketLines,
  type KitchenTicketContentInput,
} from "@/printing/create-kitchen-ticket-content";
import {
  NO_LAST_PRODUCT_MESSAGE,
  PRODUCTS_LOCKED_MESSAGE,
} from "@/delivery/use-cases/can-edit-fulfillment-products";
import { LOCKED_BY_DOCUMENT_MESSAGE } from "@/delivery/use-cases/plan-delivery-edit";
import {
  listDeliveredToday,
  transitionDelivery,
  updateDeliveryDetails,
} from "@/delivery/db_repository";
import {
  deliverDelivery,
  dispatchDelivery,
  editDeliveryDetails,
  openDelivery,
  openTakeAway,
} from "@/delivery/actions";
import { persistRoundItemCancellation } from "@/order/rounds/db_repository";
import {
  findServiceSessions,
  updateSessionStatus,
} from "@/table/db_repository";
import { closeServiceSessionAction } from "@/table/actions";
import { cancelOrder } from "@/order/actions";
import {
  createFixture,
  type RestaurantFixture,
} from "./helpers/restaurant-fixture";

let f: RestaurantFixture;
const db = () => prisma();

beforeAll(async () => {
  f = await createFixture("del-mesas");
});
afterAll(async () => {
  await f.destroy();
});
beforeEach(() => {
  mocks.getSession.mockResolvedValue({ user: f.user("admin") });
  mocks.broadcast.mockReset();
  mocks.broadcast.mockResolvedValue(undefined);
});

const session = (orderId: string) =>
  db().tableSession.findUniqueOrThrow({ where: { id: f.sessionOf(orderId) } });
const order = (orderId: string) =>
  db().order.findUniqueOrThrow({
    where: { id: orderId },
    include: { delivery: true, orderItems: true },
  });
const version = async (orderId: string) =>
  (await order(orderId)).updatedAt.toISOString();
const roundItem = (orderId: string) =>
  db().orderRoundItem.findFirstOrThrow({
    where: { orderRound: { orderId }, productId: f.ids.productA },
  });
const cancelA = async (orderId: string, by = f.ids.admin) =>
  persistRoundItemCancellation({
    cancellationId: randomUUID(),
    orderRoundItemId: (await roundItem(orderId)).id,
    quantity: 1,
    companyId: f.ids.company,
    userId: by,
    isAdmin: true,
  });

describe("Delivery en Mesas · creación", () => {
  test("un delivery es una sesión sin mesa; el total suma el envío sin crear un ítem", async () => {
    const orderId = await f.createOrder({
      delivery: { ...f.defaultDelivery, phone: "+51 987 654 321" },
    });
    const created = await order(orderId);
    expect(created).toMatchObject({
      orderType: "DELIVERY",
      status: "PENDING",
      paymentStatus: "PENDING",
    });
    expect(created.total.toNumber()).toBe(55);
    expect(created.netTotal.toNumber()).toBe(55);
    expect(created.orderItems).toHaveLength(2);
    expect(created.delivery).toMatchObject({
      status: "PENDING",
      phone: "987654321",
      name: "Maria Quispe",
    });
    expect(await session(orderId)).toMatchObject({
      tableId: null,
      status: "OPEN",
      current: true,
    });
  });

  test("el nombre es opcional y la referencia admite notas como “paga con”", async () => {
    const orderId = await f.createOrder({
      delivery: {
        phone: "912345678",
        address: "Jr. Lima 45",
        reference: "Paga con 100",
        fee: 0,
      },
    });
    expect((await order(orderId)).delivery).toMatchObject({
      name: null,
      reference: "Paga con 100",
    });
  });

  test("para llevar no crea Delivery ni envío", async () => {
    const orderId = await f.createOrder({ orderType: "TAKE_AWAY" });
    const created = await order(orderId);
    expect(created.orderType).toBe("TAKE_AWAY");
    expect(created.delivery).toBeNull();
    expect(created.total.toNumber()).toBe(50);
  });

  test("se pueden tener varios deliveries abiertos a la vez", async () => {
    const before = await findServiceSessions(f.ids.company);
    const ids = await Promise.all([f.openOrder(), f.openOrder()]);
    const after = await findServiceSessions(f.ids.company);
    expect(before.success && after.success).toBe(true);
    if (!before.success || !after.success) return;
    expect(after.data.length - before.data.length).toBe(2);
    for (const orderId of ids)
      expect(after.data.map((s) => s.id)).toContain(f.sessionOf(orderId));
    expect(after.data.every((s) => s.tableId === null)).toBe(true);
  });

  test("la acción valida los datos y abre con los permisos de Mesas", async () => {
    expect(await openDelivery({ phone: "123", address: "" })).toMatchObject({
      success: false,
      errors: { phone: expect.any(String), address: expect.any(String) },
    });

    mocks.getSession.mockResolvedValue({ user: f.user("waiter") });
    const opened = await openDelivery({
      phone: "987654321",
      address: "Av. Sol 123",
      fee: "5",
    });
    expect(opened, JSON.stringify(opened)).toMatchObject({ success: true });
    const takeAway = await openTakeAway({
      sessionId: randomUUID(),
      customerName: null,
    });
    expect(takeAway.success).toBe(true);
    for (const result of [opened, takeAway])
      if (result.success) {
        const row = await db().order.findFirstOrThrow({
          where: { tableSessionId: result.data.sessionId },
        });
        f.orderIds.push(row.id);
      }

    mocks.getSession.mockResolvedValue({
      user: { ...f.user("seller"), role: "KITCHEN" },
    });
    expect(
      await openTakeAway({ sessionId: randomUUID(), customerName: null }),
    ).toMatchObject({ success: false });
  });

  test("openDelivery con null ya no abre un para llevar", async () => {
    const before = await db().tableSession.count({
      where: { companyId: f.ids.company },
    });
    expect(await openDelivery(null)).toMatchObject({
      success: false,
      errors: expect.any(Object),
    });
    expect(
      await db().tableSession.count({ where: { companyId: f.ids.company } }),
    ).toBe(before);
  });

  test("la comanda lleva el nombre del cliente, sin teléfono, dirección ni precios", async () => {
    const orderId = await f.createOrder({
      delivery: { ...f.defaultDelivery, name: "Luis Rojas" },
    });
    const tickets = await db().kitchenTicket.findMany({
      where: { orderRound: { orderId } },
      select: { id: true },
    });
    const jobs = await db().printJob.findMany({
      where: {
        sourceType: "KITCHEN_TICKET",
        sourceId: { in: tickets.map((ticket) => ticket.id) },
      },
    });
    expect(jobs).toHaveLength(1);
    // La comanda se imprime como imagen: se revisan las líneas que la dibujan.
    const ticket = jobs[0].snapshot as unknown as KitchenTicketContentInput;
    const text = kitchenTicketLines({
      ...ticket,
      createdAt: new Date(ticket.createdAt),
    })
      .map((line) => (line === "rule" ? "" : line.text))
      .join("\n");
    expect(text).toContain("Delivery: Luis Rojas");
    expect(text).not.toContain("Cliente:");
    expect(text).toContain("Producto A");
    for (const forbidden of [
      "987654321",
      "Olivos",
      "reja negra",
      "S/",
      "Envío",
      "30.00",
    ])
      expect(text).not.toContain(forbidden);
  });
});

describe("Delivery en Mesas · adiciones y retiros", () => {
  test("un delivery pendiente admite adiciones y conserva el envío en el total", async () => {
    const orderId = await f.createOrder({});
    const added = await f.addRound(orderId, [
      { productId: f.ids.productC, quantity: 1 },
    ]);
    expect(added.success, JSON.stringify(added)).toBe(true);
    expect((await order(orderId)).total.toNumber()).toBe(70);
  });

  test("tras despachar se rechazan adiciones y retiros", async () => {
    const orderId = await f.createOrder({});
    expect(
      await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DISPATCH"),
    ).toMatchObject({ success: true, data: { status: "DISPATCHED" } });
    expect(
      await f.addRound(orderId, [{ productId: f.ids.productC, quantity: 1 }]),
    ).toMatchObject({ success: false, message: PRODUCTS_LOCKED_MESSAGE });
    expect(await cancelA(orderId)).toMatchObject({
      success: false,
      message: PRODUCTS_LOCKED_MESSAGE,
    });
    expect((await order(orderId)).total.toNumber()).toBe(55);
  });

  test("tras cobrar se rechazan adiciones y retiros", async () => {
    const orderId = await f.createOrder({ orderType: "TAKE_AWAY" });
    expect((await f.pay(orderId)).success).toBe(true);
    expect(
      (await f.addRound(orderId, [{ productId: f.ids.productC, quantity: 1 }]))
        .success,
    ).toBe(false);
    expect((await cancelA(orderId)).success).toBe(false);
  });

  test("el retiro recalcula el total con envío y no deja el pedido vacío", async () => {
    const orderId = await f.createOrder({
      items: [{ productId: f.ids.productA, quantity: 1 }],
    });
    expect(await cancelA(orderId)).toMatchObject({
      success: false,
      message: NO_LAST_PRODUCT_MESSAGE,
    });
    const other = await f.createOrder({});
    const stock = await f.stockA();
    expect((await cancelA(other)).success).toBe(true);
    expect((await order(other)).total.toNumber()).toBe(25);
    // El stock se descuenta al cobrar: retirar antes no lo mueve.
    expect(await f.stockA()).toBe(stock);
  });
});

describe("Delivery en Mesas · entrega y cierre", () => {
  test("se entrega sin cobrar; al cobrar después la sesión se cierra", async () => {
    const orderId = await f.createOrder({});
    expect(
      await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DELIVER"),
    ).toMatchObject({ success: false });
    await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DISPATCH");
    expect(
      await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DELIVER"),
    ).toMatchObject({
      success: true,
      data: { status: "DELIVERED", closed: false },
    });
    expect(await session(orderId)).toMatchObject({
      status: "OPEN",
      current: true,
    });
    expect((await order(orderId)).status).toBe("PENDING");

    expect((await f.pay(orderId)).success).toBe(true);
    expect(await session(orderId)).toMatchObject({
      status: "CLOSED",
      current: null,
    });
    expect((await order(orderId)).status).toBe("COMPLETED");

    const delivered = await listDeliveredToday(f.ids.company);
    expect(delivered.success).toBe(true);
    if (delivered.success)
      expect(
        delivered.data.find((item) => item.orderId === orderId),
      ).toMatchObject({
        sessionId: f.sessionOf(orderId),
        title: "Delivery · Maria Quispe",
        address: f.defaultDelivery.address,
        total: 55,
      });
  });

  test("cobrado antes, la entrega cierra la sesión", async () => {
    const orderId = await f.createOrder({});
    expect((await f.pay(orderId)).success).toBe(true);
    expect((await session(orderId)).current).toBe(true);
    await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DISPATCH");
    expect(
      await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DELIVER"),
    ).toMatchObject({ success: true, data: { closed: true } });
    expect(await session(orderId)).toMatchObject({
      status: "CLOSED",
      current: null,
    });
    expect((await order(orderId)).status).toBe("COMPLETED");
    // Reintentar la entrega no falla ni duplica nada.
    expect(
      await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DELIVER"),
    ).toMatchObject({ success: true, data: { status: "DELIVERED" } });
  });

  test("para llevar se cierra al entregarlo, solo si ya está cobrado", async () => {
    const orderId = await f.createOrder({ orderType: "TAKE_AWAY" });
    expect(
      (await updateSessionStatus(f.sessionOf(orderId), f.ids.company, "CLOSED"))
        .success,
    ).toBe(false);
    expect((await f.pay(orderId)).success).toBe(true);
    expect((await session(orderId)).current).toBe(true);
    expect(await closeServiceSessionAction(f.sessionOf(orderId))).toMatchObject(
      { success: true },
    );
    expect(await session(orderId)).toMatchObject({
      status: "CLOSED",
      current: null,
    });
    expect((await order(orderId)).status).toBe("COMPLETED");
    const delivered = await listDeliveredToday(f.ids.company);
    expect(
      delivered.success &&
        delivered.data.find((item) => item.orderId === orderId)?.title,
    ).toMatch(/^Para llevar · pedido de las \d{1,2}:\d{2}/);
  });

  test("la anulación general rechaza un delivery completado", async () => {
    const orderId = await f.createOrder({});
    expect((await f.pay(orderId)).success).toBe(true);
    await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DISPATCH");
    await transitionDelivery(f.ids.company, f.ids.admin, orderId, "DELIVER");
    expect((await cancelOrder(orderId, "Cliente llamó")).success).toBe(false);
    expect((await order(orderId)).status).toBe("COMPLETED");
  });

  test("las acciones de entrega exigen permiso de Mesas y la empresa de la sesión", async () => {
    const orderId = await f.createOrder({});
    expect(
      await transitionDelivery(randomUUID(), f.ids.admin, orderId, "DISPATCH"),
    ).toMatchObject({
      success: false,
      message: "El pedido no está disponible.",
    });
    mocks.getSession.mockResolvedValue({
      user: { ...f.user("seller"), role: "KITCHEN" },
    });
    expect((await dispatchDelivery({ orderId })).success).toBe(false);
    mocks.getSession.mockResolvedValue({ user: f.user("waiter") });
    expect(await dispatchDelivery({ orderId })).toMatchObject({
      success: true,
    });
    expect(await deliverDelivery({ orderId })).toMatchObject({
      success: true,
    });

    // Realtime solo avisa que algo cambió, sin datos del cliente.
    const payloads = JSON.stringify(mocks.broadcast.mock.calls);
    expect(mocks.broadcast).toHaveBeenCalled();
    for (const sensitive of ["987654321", "Olivos", "Maria", "reja negra"])
      expect(payloads).not.toContain(sensitive);
  });
});

describe("Delivery en Mesas · edición de datos", () => {
  const edit = async (orderId: string, changes: Record<string, unknown>) =>
    updateDeliveryDetails(f.ids.company, {
      ...f.defaultDelivery,
      ...changes,
      orderId,
      updatedAt: await version(orderId),
    });

  test("sin comprobante, cambiar el envío recalcula el total", async () => {
    const orderId = await f.createOrder({});
    expect(await edit(orderId, { fee: 8 })).toMatchObject({
      success: true,
      data: { total: 58 },
    });
    expect((await order(orderId)).total.toNumber()).toBe(58);
  });

  test("cobrado, el contacto se corrige pero el envío queda bloqueado", async () => {
    const orderId = await f.createOrder({});
    expect((await f.pay(orderId)).success).toBe(true);
    expect(
      await edit(orderId, { address: "Jr. Nuevo 1", phone: "912345678" }),
    ).toMatchObject({ success: true, data: { total: 55 } });
    expect((await order(orderId)).delivery).toMatchObject({
      address: "Jr. Nuevo 1",
      phone: "912345678",
    });
    expect(
      await edit(orderId, {
        address: "Otra",
        phone: "912345678",
        fee: 9,
      }),
    ).toMatchObject({ success: false, message: LOCKED_BY_DOCUMENT_MESSAGE });
    expect((await order(orderId)).delivery?.address).toBe("Jr. Nuevo 1");
  });

  test("una versión vencida se rechaza sin cambios", async () => {
    const orderId = await f.createOrder({});
    const stale = await version(orderId);
    expect((await edit(orderId, { name: "Primero" })).success).toBe(true);
    expect(
      await updateDeliveryDetails(f.ids.company, {
        ...f.defaultDelivery,
        name: "Segundo",
        orderId,
        updatedAt: stale,
      }),
    ).toMatchObject({ success: false });
    expect((await order(orderId)).delivery?.name).toBe("Primero");
  });

  test("la acción ignora totales y estados enviados por el cliente", async () => {
    const orderId = await f.createOrder({});
    const result = await editDeliveryDetails({
      ...f.defaultDelivery,
      orderId,
      updatedAt: await version(orderId),
      total: 1,
      status: "DELIVERED",
      companyId: randomUUID(),
    });
    expect(result.success, JSON.stringify(result)).toBe(true);
    const row = await order(orderId);
    expect(row.total.toNumber()).toBe(55);
    expect(row.delivery?.status).toBe("PENDING");
  });
});

describe("Delivery en Mesas · concurrencia", () => {
  test("edición de envío contra cobro: gana uno y el total cobrado es coherente", async () => {
    const orderId = await f.createOrder({});
    const [input, updatedAt] = await Promise.all([
      f.paymentInput(orderId),
      version(orderId),
    ]);
    const [paid, edited] = await Promise.all([
      f.pay(orderId, input),
      updateDeliveryDetails(f.ids.company, {
        ...f.defaultDelivery,
        fee: 8,
        orderId,
        updatedAt,
      }),
    ]);
    expect(paid.success && edited.success).toBe(false);
    const row = await order(orderId);
    const documents = await db().document.findMany({ where: { orderId } });
    if (paid.success) {
      expect(row.delivery?.fee.toNumber()).toBe(5);
      expect(documents.map((d) => d.total.toNumber())).toEqual([55]);
    } else {
      expect(documents).toHaveLength(0);
      expect(row.total.toNumber()).toBe(58);
    }
  });

  test("adición contra despacho: la ronda entra antes del despacho o se rechaza", async () => {
    const orderId = await f.createOrder({});
    const [added, dispatched] = await Promise.all([
      f.addRound(orderId, [{ productId: f.ids.productC, quantity: 1 }]),
      transitionDelivery(f.ids.company, f.ids.admin, orderId, "DISPATCH"),
    ]);
    expect(dispatched.success, JSON.stringify(dispatched)).toBe(true);
    const row = await order(orderId);
    const rounds = await db().orderRound.count({ where: { orderId } });
    if (added.success) {
      expect(rounds).toBe(2);
      expect(row.total.toNumber()).toBe(70);
    } else {
      expect(rounds).toBe(1);
      expect(row.total.toNumber()).toBe(55);
    }
    expect(row.delivery?.status).toBe("DISPATCHED");
  });
});
