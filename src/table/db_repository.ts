import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import type { Zone, Table, TableSession, TableWithSession } from "./types";
import { $Enums } from "@prisma/client";

// -- Mappers --

const SESSION_STATUS_MAPPER: Record<$Enums.TableSessionStatus, TableSession["status"]> = {
  OPEN: "OPEN",
  BILL_REQUESTED: "BILL_REQUESTED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
};

function mapPrismaSession(s: any): TableSession {
  const orderItems = s.order?.orderItems || [];
  const maxRound = orderItems.length > 0
    ? Math.max(...orderItems.map((oi: any) => oi.round ?? 1))
    : 0;

  return {
    id: s.id,
    companyId: s.companyId,
    tableId: s.tableId,
    waiterId: s.waiterId,
    waiter: s.waiter ? { id: s.waiter.id, name: s.waiter.name } : undefined,
    status: SESSION_STATUS_MAPPER[s.status as $Enums.TableSessionStatus],
    current: s.current,
    guestCount: s.guestCount,
    notes: s.notes,
    orderId: s.order?.id ?? null,
    currentRound: maxRound,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function mapPrismaTable(t: any): TableWithSession {
  const currentSession = t.sessions?.find((s: any) => s.current === true);
  return {
    id: t.id,
    companyId: t.companyId,
    number: t.number,
    label: t.label,
    capacity: t.capacity,
    zoneId: t.zoneId,
    zone: t.zone ? { id: t.zone.id, companyId: t.zone.companyId, name: t.zone.name, order: t.zone.order, active: t.zone.active, createdAt: t.zone.createdAt, updatedAt: t.zone.updatedAt } : undefined,
    active: t.active,
    activeSession: currentSession ? mapPrismaSession(currentSession) : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// -- Zone CRUD --

export async function findZones(companyId: string): Promise<response<Zone[]>> {
  try {
    const zones = await prisma().zone.findMany({
      where: { companyId, active: true },
      orderBy: { order: "asc" },
    });
    return { success: true, data: zones };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function findZone(id: string, companyId: string): Promise<response<Zone>> {
  try {
    const zone = await prisma().zone.findFirst({ where: { id, companyId } });
    if (!zone) return { success: false, message: "Zona no encontrada" };
    return { success: true, data: zone };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function createZone(companyId: string, data: { name: string; order?: number }): Promise<response<Zone>> {
  try {
    const zone = await prisma().zone.create({
      data: { companyId, name: data.name, order: data.order ?? 0 },
    });
    return { success: true, data: zone };
  } catch (e: any) {
    if (e.code === "P2002") {
      return { success: false, message: "Ya existe una zona con ese nombre" };
    }
    return { success: false, message: e.message };
  }
}

export async function updateZone(id: string, companyId: string, data: { name?: string; order?: number }): Promise<response<Zone>> {
  try {
    const zone = await prisma().zone.update({
      where: { id },
      data: { ...data },
    });
    return { success: true, data: zone };
  } catch (e: any) {
    if (e.code === "P2002") {
      return { success: false, message: "Ya existe una zona con ese nombre" };
    }
    return { success: false, message: e.message };
  }
}

export async function deleteZone(id: string, companyId: string): Promise<response<void>> {
  try {
    const activeTables = await prisma().table.count({
      where: { zoneId: id, companyId, active: true },
    });
    if (activeTables > 0) {
      return { success: false, message: "No se puede eliminar una zona con mesas activas" };
    }
    await prisma().zone.update({ where: { id }, data: { active: false } });
    return { success: true, data: undefined };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// -- Table CRUD --

export async function findTables(companyId: string, zoneId?: string): Promise<response<TableWithSession[]>> {
  try {
    const tables = await prisma().table.findMany({
      where: {
        companyId,
        active: true,
        ...(zoneId ? { zoneId } : {}),
      },
      include: {
        zone: true,
        sessions: {
          where: { current: true },
          include: {
            waiter: { select: { id: true, name: true } },
            order: { include: { orderItems: true } },
          },
        },
      },
      orderBy: { number: "asc" },
    });
    return { success: true, data: tables.map(mapPrismaTable) };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function findTable(id: string, companyId: string): Promise<response<TableWithSession>> {
  try {
    const table = await prisma().table.findFirst({
      where: { id, companyId },
      include: {
        zone: true,
        sessions: {
          where: { current: true },
          include: {
            waiter: { select: { id: true, name: true } },
            order: {
              include: {
                orderItems: {
                  include: { product: { include: { photos: true } } },
                  orderBy: { createdAt: "asc" },
                },
                payments: true,
              },
            },
          },
        },
      },
    });
    if (!table) return { success: false, message: "Mesa no encontrada" };
    return { success: true, data: mapPrismaTable(table) };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function createTable(companyId: string, data: { number: number; label?: string; capacity: number; zoneId: string }): Promise<response<Table>> {
  try {
    const table = await prisma().table.create({
      data: { companyId, ...data, label: data.label || null },
    });
    return { success: true, data: { ...table, activeSession: null } };
  } catch (e: any) {
    if (e.code === "P2002") {
      return { success: false, message: "Ya existe una mesa con ese numero" };
    }
    return { success: false, message: e.message };
  }
}

export async function updateTable(id: string, companyId: string, data: { number?: number; label?: string; capacity?: number; zoneId?: string }): Promise<response<Table>> {
  try {
    const table = await prisma().table.update({
      where: { id },
      data: { ...data, label: data.label || null },
    });
    return { success: true, data: { ...table, activeSession: null } };
  } catch (e: any) {
    if (e.code === "P2002") {
      return { success: false, message: "Ya existe una mesa con ese numero" };
    }
    return { success: false, message: e.message };
  }
}

export async function deleteTable(id: string, companyId: string): Promise<response<void>> {
  try {
    const activeSessions = await prisma().tableSession.count({
      where: { tableId: id, current: true },
    });
    if (activeSessions > 0) {
      return { success: false, message: "No se puede eliminar una mesa con sesion activa" };
    }
    await prisma().table.update({ where: { id }, data: { active: false } });
    return { success: true, data: undefined };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// -- Table Session --

export async function findActiveSession(tableId: string): Promise<response<TableSession>> {
  try {
    const session = await prisma().tableSession.findFirst({
      where: { tableId, current: true },
      include: {
        waiter: { select: { id: true, name: true } },
        order: {
          include: {
            orderItems: {
              include: { product: true },
              orderBy: { createdAt: "asc" },
            },
            payments: true,
          },
        },
      },
    });
    if (!session) return { success: false, message: "No hay sesion activa" };
    return { success: true, data: mapPrismaSession(session) };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function createSession(data: {
  companyId: string;
  tableId: string;
  waiterId: string;
  guestCount?: number;
  notes?: string;
}): Promise<response<TableSession>> {
  try {
    const session = await prisma().tableSession.create({
      data: {
        companyId: data.companyId,
        tableId: data.tableId,
        waiterId: data.waiterId,
        guestCount: data.guestCount ?? null,
        notes: data.notes ?? null,
        current: true,
        status: "OPEN",
      },
      include: {
        waiter: { select: { id: true, name: true } },
      },
    });
    return { success: true, data: mapPrismaSession(session) };
  } catch (e: any) {
    if (e.code === "P2002") {
      return { success: false, message: "Esta mesa ya tiene una sesion activa" };
    }
    return { success: false, message: e.message };
  }
}

export async function updateSessionStatus(
  sessionId: string,
  status: "OPEN" | "BILL_REQUESTED" | "CLOSED" | "CANCELLED",
): Promise<response<TableSession>> {
  try {
    const isClosed = status === "CLOSED" || status === "CANCELLED";
    const session = await prisma().tableSession.update({
      where: { id: sessionId },
      data: {
        status,
        current: isClosed ? null : true,
        closedAt: isClosed ? new Date() : null,
      },
      include: {
        waiter: { select: { id: true, name: true } },
        order: { include: { orderItems: true } },
      },
    });
    return { success: true, data: mapPrismaSession(session) };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function updateSessionWaiter(
  sessionId: string,
  newWaiterId: string,
): Promise<response<TableSession>> {
  try {
    const session = await prisma().tableSession.update({
      where: { id: sessionId },
      data: { waiterId: newWaiterId },
      include: {
        waiter: { select: { id: true, name: true } },
        order: { include: { orderItems: true } },
      },
    });
    return { success: true, data: mapPrismaSession(session) };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function createDineInOrder(
  sessionId: string,
  companyId: string,
): Promise<response<string>> {
  try {
    const order = await prisma().order.create({
      data: {
        companyId,
        tableSessionId: sessionId,
        orderType: "DINE_IN",
        status: "PENDING",
        discountAmount: 0,
        netTotal: 0,
        total: 0,
      },
    });
    return { success: true, data: order.id };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function getOrderBySessionId(sessionId: string): Promise<response<{ id: string; orderItems: any[] }>> {
  try {
    const order = await prisma().order.findFirst({
      where: { tableSessionId: sessionId },
      include: {
        orderItems: {
          include: { product: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!order) return { success: false, message: "Orden no encontrada" };
    return { success: true, data: { id: order.id, orderItems: order.orderItems } };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function addOrderItems(
  orderId: string,
  round: number,
  items: Array<{
    productId: string;
    quantity: number;
    productPrice: number;
    notes?: string;
  }>,
): Promise<response<void>> {
  try {
    await prisma().orderItem.createMany({
      data: items.map((item) => ({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        productPrice: item.productPrice,
        discountAmount: 0,
        netTotal: item.quantity * item.productPrice,
        total: item.quantity * item.productPrice,
        notes: item.notes ?? null,
        round,
      })),
    });

    // Update order totals
    const allItems = await prisma().orderItem.findMany({ where: { orderId } });
    const total = allItems.reduce((sum, i) => sum + i.total.toNumber(), 0);
    await prisma().order.update({
      where: { id: orderId },
      data: { total, netTotal: total },
    });

    return { success: true, data: undefined };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function getWaiters(companyId: string): Promise<response<Array<{ id: string; name: string | null }>>> {
  try {
    const waiters = await prisma().user.findMany({
      where: { companyId, active: true, role: { in: ["WAITER", "ADMIN"] } },
      select: { id: true, name: true },
    });
    return { success: true, data: waiters };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}
