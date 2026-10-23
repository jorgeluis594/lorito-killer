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
import { log } from "@/lib/log";
import {
  kitchenTicketLines,
  type KitchenTicketContentInput,
} from "@/printing/create-kitchen-ticket-content";
import { kitchenTicketPrintStrategy } from "@/kitchen/print-strategy";
import { findKitchenTickets } from "@/kitchen/db_repository";
import {
  isSessionPrimaryKeyConflict,
  listDeliveredToday,
  listUnpaidFulfillmentOrders,
  openServiceSession,
} from "@/delivery/db_repository";
import {
  openDelivery,
  openTakeAway,
  saveTakeAwayCustomerName,
} from "@/delivery/actions";
import { formatLimaTime } from "@/delivery/use-cases/describe-service-order";
import { closeServiceSessionAction } from "@/table/actions";
import { updateTableDraft } from "@/table/draft-repository";
import { findServiceSessions } from "@/table/db_repository";
import { getTablePaymentData } from "@/table/payment-repository";
import {
  createFixture,
  type RestaurantFixture,
} from "./helpers/restaurant-fixture";

let f: RestaurantFixture;
const db = () => prisma();

beforeAll(async () => {
  f = await createFixture("take-away-name");
});
afterAll(async () => {
  await f.destroy();
});
beforeEach(() => {
  mocks.getSession.mockResolvedValue({ user: f.user("waiter") });
  mocks.broadcast.mockReset();
  mocks.broadcast.mockResolvedValue(undefined);
  vi.restoreAllMocks();
});

/** Abre por la acción, como la hoja, y registra el pedido para la limpieza. */
async function open(customerName: string | null, sessionId = randomUUID()) {
  const result = await openTakeAway({ sessionId, customerName });
  if (result.success) await track(result.data.sessionId);
  return { result, sessionId };
}
async function track(sessionId: string) {
  const order = await db().order.findFirst({
    where: { tableSessionId: sessionId },
  });
  if (order && !f.orderIds.includes(order.id)) f.orderIds.push(order.id);
  return order;
}
const sessionRow = (sessionId: string) =>
  db().tableSession.findUniqueOrThrow({ where: { id: sessionId } });
const save = (
  sessionId: string,
  customerName: string | null,
  expectedName: string | null,
) => saveTakeAwayCustomerName({ sessionId, customerName, expectedName });

/** Registra la sesión en el fixture para usar sus ayudantes de rondas y cobro. */
async function withName(customerName: string | null, withItems = true) {
  const orderId = await f.createOrder({
    orderType: "TAKE_AWAY",
    customerName,
    items: withItems ? undefined : [],
  });
  return { orderId, sessionId: f.sessionOf(orderId) };
}
async function openEmpty(customerName: string | null) {
  const orderId = await f.openOrder({ orderType: "TAKE_AWAY", customerName });
  return { orderId, sessionId: f.sessionOf(orderId) };
}
const ticketText = async (orderId: string, reprint = false) => {
  const tickets = await db().kitchenTicket.findMany({
    where: { orderRound: { orderId } },
    orderBy: { createdAt: "asc" },
  });
  const texts: { snapshot: KitchenTicketContentInput; text: string }[] = [];
  for (const ticket of tickets) {
    // Solo Cocina tiene impresora en el fixture; Barra no genera trabajo.
    const hasJob = await db().printJob.count({
      where: { sourceType: "KITCHEN_TICKET", sourceId: ticket.id },
    });
    if (!hasJob) continue;
    const snapshot = reprint
      ? await kitchenTicketPrintStrategy.buildSnapshot(
          db(),
          f.ids.company,
          ticket.id,
          { isReprint: true },
        )
      : ((
          await db().printJob.findFirstOrThrow({
            where: { sourceType: "KITCHEN_TICKET", sourceId: ticket.id },
          })
        ).snapshot as unknown as KitchenTicketContentInput);
    const lines = kitchenTicketLines({
      ...snapshot,
      createdAt: new Date(snapshot.createdAt),
    });
    texts.push({
      snapshot,
      text: lines.map((line) => (line === "rule" ? "" : line.text)).join("\n"),
    });
  }
  return texts;
};

describe("Para llevar · apertura", () => {
  test("abre un para llevar con «Rosa» y la tarjeta y el título lo muestran", async () => {
    const { result } = await open("Rosa");
    expect(result.success).toBe(true);
    if (!result.success) return;
    const sessions = await findServiceSessions(f.ids.company);
    expect(sessions.success).toBe(true);
    if (!sessions.success) return;
    const found = sessions.data.find((s) => s.id === result.data.sessionId);
    expect(found).toMatchObject({ customerName: "Rosa", tableId: null });
    const { describeServiceOrder } = await import(
      "@/delivery/use-cases/describe-service-order"
    );
    const labels = describeServiceOrder({
      channel: "TAKE_AWAY",
      customerName: found!.customerName,
      openedAt: found!.openedAt,
    });
    expect(labels.cardTitle).toBe("Rosa");
    expect(labels.heading).toBe("Para llevar · Rosa");
    expect(mocks.broadcast).toHaveBeenCalledTimes(1);
  });

  test("repetir la apertura con la misma clave devuelve la misma sesión y deja una sola tarjeta", async () => {
    const sessionId = randomUUID();
    const first = await open("Rosa", sessionId);
    const again = await open("Otra", sessionId);
    expect(first.result).toMatchObject({ success: true, data: { sessionId } });
    expect(again.result).toMatchObject({ success: true, data: { sessionId } });
    expect(await db().tableSession.count({ where: { id: sessionId } })).toBe(1);
    expect(
      await db().order.count({ where: { tableSessionId: sessionId } }),
    ).toBe(1);
    // El reintento no reescribe el nombre del primer intento.
    expect((await sessionRow(sessionId)).customerName).toBe("Rosa");
    // Una réplica no vuelve a notificar.
    expect(mocks.broadcast).toHaveBeenCalledTimes(1);
  });

  test("dos aperturas simultáneas con la misma clave dejan una sola sesión y una sola orden", async () => {
    const sessionId = randomUUID();
    const [a, b] = await Promise.all([
      openTakeAway({ sessionId, customerName: "Rosa" }),
      openTakeAway({ sessionId, customerName: "Rosa" }),
    ]);
    await track(sessionId);
    expect(a.success && b.success).toBe(true);
    expect(await db().tableSession.count({ where: { id: sessionId } })).toBe(1);
    expect(
      await db().order.count({ where: { tableSessionId: sessionId } }),
    ).toBe(1);
  });

  test("una clave que pertenece a otra empresa no abre ni revela su pedido", async () => {
    const other = await createFixture("take-away-other");
    try {
      const orderId = await other.openOrder({
        orderType: "TAKE_AWAY",
        customerName: "Secreto",
      });
      const foreign = other.sessionOf(orderId);
      const result = await openTakeAway({
        sessionId: foreign,
        customerName: "Rosa",
      });
      expect(result).toEqual({
        success: false,
        message: "No se pudo crear el pedido. Vuelve a intentarlo.",
      });
      expect(JSON.stringify(result)).not.toContain("Secreto");
      expect((await sessionRow(foreign)).customerName).toBe("Secreto");
    } finally {
      await other.destroy();
    }
  });

  test("reintentar la apertura de un pedido que otro dispositivo ya liberó devuelve su sesión marcada como cerrada", async () => {
    const sessionId = randomUUID();
    const first = await openServiceSession({
      companyId: f.ids.company,
      userId: f.ids.waiter,
      sessionId,
      customerName: "Rosa",
      delivery: null,
    });
    await track(sessionId);
    expect(first.success && first.data).toMatchObject({
      replayed: false,
      closed: false,
    });
    const released = await updateTableDraft({
      companyId: f.ids.company,
      userId: f.ids.waiter,
      sessionId,
      revision: 0,
      operation: "release",
    });
    expect(released.success).toBe(true);
    const retry = await openServiceSession({
      companyId: f.ids.company,
      userId: f.ids.waiter,
      sessionId,
      customerName: "Rosa",
      delivery: null,
    });
    expect(retry).toMatchObject({
      success: true,
      data: { sessionId, replayed: true, closed: true },
    });
  });

  test("un P2002 que no es de la clave de la sesión responde falla técnica y no devuelve ninguna sesión", async () => {
    const { sessionId } = await openEmpty("Rosa");
    // Forma real de cada choque en esta versión de Prisma.
    const pk = await db()
      .tableSession.create({
        data: {
          id: sessionId,
          companyId: f.ids.company,
          waiterId: f.ids.waiter,
          order: {
            create: {
              companyId: f.ids.company,
              orderType: "TAKE_AWAY",
              status: "PENDING",
              discountAmount: 0,
              netTotal: 0,
              total: 0,
            },
          },
        },
      })
      .catch((error) => error);
    expect(isSessionPrimaryKeyConflict(pk)).toBe(true);
    expect(pk.meta.modelName).toBe("TableSession");
    const orderSide = await db()
      .order.create({
        data: {
          companyId: f.ids.company,
          tableSessionId: sessionId,
          orderType: "TAKE_AWAY",
          status: "PENDING",
          discountAmount: 0,
          netTotal: 0,
          total: 0,
        },
      })
      .catch((error) => error);
    expect(orderSide.code).toBe("P2002");
    expect(orderSide.meta.modelName).toBe("Order");
    expect(isSessionPrimaryKeyConflict(orderSide)).toBe(false);

    // El choque del lado de la orden, aunque exista la sesión con esa clave.
    vi.spyOn(db(), "$transaction").mockRejectedValueOnce(orderSide);
    const result = await openServiceSession({
      companyId: f.ids.company,
      userId: f.ids.waiter,
      sessionId,
      customerName: "Rosa",
      delivery: null,
    });
    expect(result).toEqual({
      success: false,
      message: "No se pudo crear el pedido. Vuelve a intentarlo.",
    });
  });

  test("abrir con «   » deja el pedido sin nombre", async () => {
    const { result } = await open("   ");
    expect(result.success).toBe(true);
    if (result.success)
      expect((await sessionRow(result.data.sessionId)).customerName).toBeNull();
  });

  test("rechaza abrir con 121 caracteres sin crear el pedido", async () => {
    const sessionId = randomUUID();
    const result = await openTakeAway({
      sessionId,
      customerName: "a".repeat(121),
    });
    expect(result).toMatchObject({
      success: false,
      message: "El nombre puede tener hasta 120 caracteres.",
      errors: { customerName: "El nombre puede tener hasta 120 caracteres." },
    });
    expect(await db().tableSession.count({ where: { id: sessionId } })).toBe(0);
  });

  test("un vendedor abre y renombra un para llevar; cocina es rechazada por permiso", async () => {
    mocks.getSession.mockResolvedValue({ user: f.user("seller") });
    const { result } = await open("Rosa");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(await save(result.data.sessionId, "Rosa M.", "Rosa")).toMatchObject({
      success: true,
    });
    mocks.getSession.mockResolvedValue({
      user: { ...f.user("seller"), role: "KITCHEN" },
    });
    expect(
      await openTakeAway({ sessionId: randomUUID(), customerName: null }),
    ).toMatchObject({ success: false, type: "AuthorizationError" });
    expect(await save(result.data.sessionId, "Otra", "Rosa M.")).toMatchObject({
      success: false,
      type: "AuthorizationError",
    });
  });

  test("openDelivery no guarda el nombre en la sesión", async () => {
    const opened = await openDelivery({
      phone: "987654321",
      address: "Av. Sol 123",
      name: "Ana",
      fee: "0",
    });
    expect(opened.success).toBe(true);
    if (!opened.success) return;
    await track(opened.data.sessionId);
    expect((await sessionRow(opened.data.sessionId)).customerName).toBeNull();
  });
});

describe("Para llevar · renombrar", () => {
  test("guarda «Rosa M.» aunque otro dispositivo haya enviado una ronda y cobrado desde que se abrió la hoja", async () => {
    const { orderId, sessionId } = await withName("Rosa");
    expect((await f.pay(orderId)).success).toBe(true);
    const result = await save(sessionId, "Rosa M.", "Rosa");
    expect(result).toMatchObject({
      success: true,
      data: { customerName: "Rosa M.", changed: true },
    });
    expect((await sessionRow(sessionId)).customerName).toBe("Rosa M.");
  });

  test("guardar el nombre no cambia la versión del cobro ni la revisión del borrador", async () => {
    const { orderId, sessionId } = await withName("Rosa");
    const order = () =>
      db().order.findUniqueOrThrow({ where: { id: orderId } });
    const before = {
      order: await order(),
      session: await sessionRow(sessionId),
    };
    expect(await save(sessionId, "Rosa M.", "Rosa")).toMatchObject({
      success: true,
    });
    const after = {
      order: await order(),
      session: await sessionRow(sessionId),
    };
    expect(after.order.updatedAt).toEqual(before.order.updatedAt);
    expect(after.session.draftRevision).toBe(before.session.draftRevision);
    // Y el cobro con la versión anterior sigue siendo válido.
    expect((await f.pay(orderId)).success).toBe(true);
  });

  test("rechaza guardar cuando otro dispositivo cambió el nombre a «Rosita»", async () => {
    const { sessionId } = await openEmpty("Rosa");
    await save(sessionId, "Rosita", "Rosa");
    const result = await save(sessionId, "Rosa M.", "Rosa");
    expect(result).toEqual({
      success: false,
      type: "CustomerNameConflict",
      message:
        "Otro dispositivo cambió el nombre a Rosita. Revisa y vuelve a guardar.",
      currentName: "Rosita",
    });
    expect((await sessionRow(sessionId)).customerName).toBe("Rosita");
  });

  test("rechaza guardar cuando otro dispositivo quitó el nombre", async () => {
    const { sessionId } = await openEmpty("Rosa");
    await save(sessionId, "  ", "Rosa");
    expect(await save(sessionId, "Rosa M.", "Rosa")).toEqual({
      success: false,
      type: "CustomerNameConflict",
      message: "Otro dispositivo quitó el nombre. Revisa y vuelve a guardar.",
      currentName: null,
    });
  });

  test("tras el conflicto con «Rosita», guardar otra vez con el nombre vigente como esperado persiste «Rosa M.»", async () => {
    const { sessionId } = await openEmpty("Rosa");
    await save(sessionId, "Rosita", "Rosa");
    const conflict = await save(sessionId, "Rosa M.", "Rosa");
    expect(conflict.success).toBe(false);
    if (conflict.success || !("currentName" in conflict)) return;
    expect(
      await save(sessionId, "Rosa M.", conflict.currentName as string | null),
    ).toMatchObject({ success: true, data: { changed: true } });
    expect((await sessionRow(sessionId)).customerName).toBe("Rosa M.");
  });

  test("guardar el mismo nombre ya guardado es éxito sin escribir ni notificar", async () => {
    const { sessionId } = await openEmpty("Rosa");
    mocks.broadcast.mockClear();
    expect(await save(sessionId, "Rosa", "Otro")).toMatchObject({
      success: true,
      data: { changed: false },
    });
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });

  test("rechaza más de 120 caracteres al guardar", async () => {
    const { sessionId } = await openEmpty("Rosa");
    expect(await save(sessionId, "a".repeat(121), "Rosa")).toMatchObject({
      success: false,
      errors: { customerName: "El nombre puede tener hasta 120 caracteres." },
    });
  });

  test("un vencimiento de la transacción (P2028) del renombre responde «No se pudo guardar el nombre. Vuelve a intentarlo.» sin type y registra take_away_customer_name_save_failed", async () => {
    const { sessionId } = await openEmpty("Rosa");
    const error = vi.spyOn(log, "error").mockImplementation(() => undefined);
    vi.spyOn(db(), "$transaction").mockRejectedValueOnce(
      Object.assign(new Error("timeout"), { code: "P2028" }),
    );
    const result = await save(sessionId, "Rosa M.", "Rosa");
    expect(result).toEqual({
      success: false,
      message: "No se pudo guardar el nombre. Vuelve a intentarlo.",
    });
    expect(error).toHaveBeenCalledWith(
      "take_away_customer_name_save_failed",
      expect.objectContaining({ sessionId, code: "P2028" }),
    );
    // Reintentar es seguro.
    expect(await save(sessionId, "Rosa M.", "Rosa")).toMatchObject({
      success: true,
    });
  });

  test("dos guardados simultáneos con el mismo nombre esperado dejan uno y rechazan el otro con el nombre vigente", async () => {
    const { sessionId } = await openEmpty("Rosa");
    const results = await Promise.all([
      save(sessionId, "Rosa A", "Rosa"),
      save(sessionId, "Rosa B", "Rosa"),
    ]);
    const ok = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    const stored = (await sessionRow(sessionId)).customerName;
    expect(["Rosa A", "Rosa B"]).toContain(stored);
    expect(failed[0]).toMatchObject({
      type: "CustomerNameConflict",
      currentName: stored,
    });
  });

  test("rechaza guardar el nombre de un pedido cerrado con «Este pedido ya se cerró.»", async () => {
    const { sessionId } = await openEmpty("Rosa");
    await updateTableDraft({
      companyId: f.ids.company,
      userId: f.ids.waiter,
      sessionId,
      revision: 0,
      operation: "release",
    });
    expect(await save(sessionId, "Rosa M.", "Rosa")).toEqual({
      success: false,
      type: "SessionClosed",
      message: "Este pedido ya se cerró.",
    });
  });

  test("responde «Este pedido ya no está disponible.» para un pedido de otra empresa, inexistente o un delivery", async () => {
    const unavailable = {
      success: false,
      type: "SessionUnavailable",
      message: "Este pedido ya no está disponible.",
    };
    expect(await save(randomUUID(), "Rosa", null)).toEqual(unavailable);
    const deliveryOrder = await f.openOrder({ orderType: "DELIVERY" });
    expect(await save(f.sessionOf(deliveryOrder), "Rosa", null)).toEqual(
      unavailable,
    );
    const other = await createFixture("take-away-other-2");
    try {
      const orderId = await other.openOrder({ orderType: "TAKE_AWAY" });
      expect(await save(other.sessionOf(orderId), "Rosa", null)).toEqual(
        unavailable,
      );
      expect((await sessionRow(other.sessionOf(orderId))).customerName).toBe(
        null,
      );
    } finally {
      await other.destroy();
    }
  });

  test("un para llevar abierto antes de la migración aparece sin nombre y acepta uno", async () => {
    const { orderId, sessionId } = await openEmpty(null);
    expect((await sessionRow(sessionId)).customerName).toBeNull();
    expect(
      await f.addRound(orderId, [{ productId: f.ids.productA, quantity: 1 }]),
    ).toMatchObject({ success: true });
    const [{ snapshot }] = await ticketText(orderId);
    expect(snapshot.orderLabel).toMatch(/^pedido de las /);
    expect(await save(sessionId, "Rosa", null)).toMatchObject({
      success: true,
    });
  });
});

describe("Para llevar · concurrencia", () => {
  test("un renombre en paralelo con el guardado del borrador deja ambos guardados, sin «el pedido cambió»", async () => {
    for (let i = 0; i < 5; i++) {
      const { sessionId } = await openEmpty("Rosa");
      const [draft, rename] = await Promise.all([
        updateTableDraft({
          companyId: f.ids.company,
          userId: f.ids.waiter,
          sessionId,
          revision: 0,
          operation: "save",
          items: [{ productId: f.ids.productB, quantity: 1 }],
        }),
        save(sessionId, `Rosa ${i}`, "Rosa"),
      ]);
      expect(draft, JSON.stringify(draft)).toMatchObject({ success: true });
      expect(rename).toMatchObject({ success: true });
      const row = await sessionRow(sessionId);
      expect(row.customerName).toBe(`Rosa ${i}`);
      expect(row.draftRevision).toBe(1);
    }
  });

  test("un renombre en paralelo con liberar el pedido vacío lo libera, o responde SessionClosed al renombre si la liberación ganó", async () => {
    for (let i = 0; i < 5; i++) {
      const { sessionId } = await openEmpty("Rosa");
      const [release, rename] = await Promise.all([
        updateTableDraft({
          companyId: f.ids.company,
          userId: f.ids.waiter,
          sessionId,
          revision: 0,
          operation: "release",
        }),
        save(sessionId, "Rosa M.", "Rosa"),
      ]);
      expect(release, JSON.stringify(release)).toMatchObject({ success: true });
      if (!rename.success)
        expect(rename).toMatchObject({ type: "SessionClosed" });
      expect((await sessionRow(sessionId)).current).toBeNull();
    }
  });

  test("un renombre en paralelo con el envío de una ronda y con el cobro deja ronda, cobro y nombre guardados", async () => {
    const { orderId, sessionId } = await withName("Rosa");
    const [round, rename] = await Promise.all([
      f.addRound(orderId, [{ productId: f.ids.productC, quantity: 1 }]),
      save(sessionId, "Rosa M.", "Rosa"),
    ]);
    expect(round, JSON.stringify(round)).toMatchObject({ success: true });
    expect(rename).toMatchObject({ success: true });

    const [paid, rename2] = await Promise.all([
      f.pay(orderId),
      save(sessionId, "Rosa N.", "Rosa M."),
    ]);
    expect(paid.success, JSON.stringify(paid)).toBe(true);
    expect(rename2).toMatchObject({ success: true });
    expect((await sessionRow(sessionId)).customerName).toBe("Rosa N.");
    expect(
      (await db().order.findUniqueOrThrow({ where: { id: orderId } }))
        .paymentStatus,
    ).toBe("PAID");
  });

  test("un renombre que espera el bloqueo de un cobro de varios segundos termina guardando, sin falla técnica", async () => {
    const { sessionId } = await openEmpty("Rosa");
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const isLocked = new Promise<void>((resolve) => (locked = resolve));
    const holder = db().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "TableSession" WHERE id = ${sessionId} FOR UPDATE`;
        locked();
        await hold;
      },
      { timeout: 20000 },
    );
    await isLocked;
    const started = Date.now();
    const pending = save(sessionId, "Rosa M.", "Rosa");
    setTimeout(release, 6000);
    const result = await pending;
    await holder;
    expect(Date.now() - started).toBeGreaterThanOrEqual(5500);
    expect(result).toMatchObject({ success: true, data: { changed: true } });
  }, 30000);

  test("un renombre en paralelo con «Entregado · cerrar pedido» guarda el nombre o responde SessionClosed, nunca «cambió»", async () => {
    for (let i = 0; i < 3; i++) {
      const { orderId, sessionId } = await withName("Rosa");
      expect((await f.pay(orderId)).success).toBe(true);
      const [closed, rename] = await Promise.all([
        closeServiceSessionAction(sessionId),
        save(sessionId, "Rosa M.", "Rosa"),
      ]);
      expect(closed, JSON.stringify(closed)).toMatchObject({ success: true });
      if (!rename.success) {
        expect(rename).toMatchObject({ type: "SessionClosed" });
        expect(rename.message).not.toContain("cambió");
      }
    }
  });
});

describe("Para llevar · superficies", () => {
  test("la comanda de Rosa guarda «Rosa» en el snapshot y la reimpresión tras renombrar usa «Rosa M.»", async () => {
    const { orderId, sessionId } = await withName("Rosa");
    const [sent] = await ticketText(orderId);
    expect(sent.snapshot.orderLabel).toBe("Rosa");
    expect(sent.snapshot.customerName).toBeUndefined();
    expect(sent.text).toContain("Para llevar: Rosa");
    expect(sent.text).not.toContain("Cliente:");
    const lines = kitchenTicketLines({
      ...sent.snapshot,
      createdAt: new Date(sent.snapshot.createdAt),
    });
    expect(
      lines.find(
        (line) => line !== "rule" && line.text === "Para llevar: Rosa",
      ),
    ).toMatchObject({ bold: true });

    await save(sessionId, "Rosa M.", "Rosa");
    const [reprint] = await ticketText(orderId, true);
    expect(reprint.text).toContain("Para llevar: Rosa M.");
    // La comanda ya guardada no cambia.
    expect((await ticketText(orderId))[0].snapshot.orderLabel).toBe("Rosa");
  });

  test("la segunda ronda de un para llevar sin nombre abierto a las 9:40 p. m. sigue diciendo «pedido de las 9:40 p. m.»", async () => {
    const { orderId, sessionId } = await withName(null);
    // 02:40 UTC = 9:40 p. m. en Lima.
    const openedAt = new Date("2026-10-24T02:40:00Z");
    await db().tableSession.update({
      where: { id: sessionId },
      data: { openedAt },
    });
    expect(
      await f.addRound(orderId, [{ productId: f.ids.productA, quantity: 1 }]),
    ).toMatchObject({ success: true });
    const [, second] = await ticketText(orderId);
    expect(second.snapshot.orderLabel).toBe(
      `pedido de las ${formatLimaTime(openedAt)}`,
    );
    expect(second.text).toContain(
      `Para llevar: pedido de las ${formatLimaTime(openedAt)}`,
    );
    expect(second.snapshot.orderLabel).not.toMatch(/^[0-9A-F]{8}$/);
  });

  test("«Impresiones pendientes» etiqueta la comanda de Rosa como «Para llevar · Rosa»", async () => {
    const { orderId } = await withName("Rosa");
    const tickets = await findKitchenTickets({
      companyId: f.ids.company,
      orderId,
    });
    expect(tickets.length).toBeGreaterThan(0);
    for (const ticket of tickets)
      expect(ticket.order.label).toBe("Para llevar · Rosa");
  });

  test("«Entregados hoy» lista «Para llevar · Rosa» y un para llevar sin nombre como «Para llevar · pedido de las 9:40 p. m.»", async () => {
    const named = await withName("Rosa");
    const unnamed = await withName(null);
    const openedAt = new Date();
    await db().tableSession.update({
      where: { id: unnamed.sessionId },
      data: { openedAt },
    });
    for (const { orderId, sessionId } of [named, unnamed]) {
      expect((await f.pay(orderId)).success).toBe(true);
      expect(await closeServiceSessionAction(sessionId)).toMatchObject({
        success: true,
      });
    }
    const delivered = await listDeliveredToday(f.ids.company);
    expect(delivered.success).toBe(true);
    if (!delivered.success) return;
    const title = (orderId: string) =>
      delivered.data.find((item) => item.orderId === orderId)?.title;
    expect(title(named.orderId)).toBe("Para llevar · Rosa");
    expect(title(unnamed.orderId)).toBe(
      `Para llevar · pedido de las ${formatLimaTime(openedAt)}`,
    );
  });

  test("el aviso de pedidos sin cobrar lista «Para llevar · Rosa · Pendiente»", async () => {
    const { orderId } = await withName("Rosa");
    const unpaid = await listUnpaidFulfillmentOrders(f.ids.company);
    expect(unpaid.success).toBe(true);
    if (!unpaid.success) return;
    const found = unpaid.data.find((item) => item.orderId === orderId)!;
    expect(`${found.orderLabel} · ${found.statusLabel}`).toBe(
      "Para llevar · Rosa · Pendiente",
    );
  });

  test("cobrar el para llevar de Rosa no la pone como cliente de la boleta: Order.customerId sigue vacío y el comprobante no la nombra", async () => {
    mocks.getSession.mockResolvedValue({ user: f.user("cashier") });
    const { orderId, sessionId } = await withName("Rosa");
    const data = await getTablePaymentData(f.ids.company, { sessionId });
    expect(data).toMatchObject({
      success: true,
      data: { title: "Para llevar · Rosa", kind: "takeaway" },
    });
    expect((await f.pay(orderId)).success).toBe(true);
    const order = await db().order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.customerId).toBeNull();
    const document = await f.documentFor(orderId);
    expect(JSON.stringify(document)).not.toContain("Rosa");
  });
});
