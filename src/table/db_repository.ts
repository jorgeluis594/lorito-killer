import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import type { Zone, Table, TableSession, TableWithSession } from "./types";
import { $Enums } from "@prisma/client";

// -- Mapper types --

type PrismaSessionResult = {
  id: string;
  companyId: string;
  tableId: string;
  waiterId: string;
  status: $Enums.TableSessionStatus;
  current: boolean | null;
  guestCount: number | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  waiter?: { id: string; name: string | null } | null;
  order?: { id: string; orderItems: Array<{ round: number }> } | null;
};

type PrismaZoneResult = {
  id: string;
  companyId: string;
  name: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaTableResult = {
  id: string;
  companyId: string;
  number: number;
  label: string | null;
  capacity: number;
  zoneId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  zone?: PrismaZoneResult | null;
  sessions?: PrismaSessionResult[];
};

// -- Mappers --

const SESSION_STATUS_MAPPER: Record<$Enums.TableSessionStatus, TableSession["status"]> = {
  OPEN: "OPEN",
  BILL_REQUESTED: "BILL_REQUESTED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
};

function mapPrismaSession(s: PrismaSessionResult): TableSession {
  const orderItems = s.order?.orderItems || [];
  const maxRound = orderItems.length > 0
    ? Math.max(...orderItems.map((oi) => oi.round ?? 1))
    : 0;

  return {
    id: s.id,
    companyId: s.companyId,
    tableId: s.tableId,
    waiterId: s.waiterId,
    waiter: s.waiter ? { id: s.waiter.id, name: s.waiter.name } : undefined,
    status: SESSION_STATUS_MAPPER[s.status],
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

function mapPrismaZone(z: PrismaZoneResult): Zone {
  return {
    id: z.id,
    companyId: z.companyId,
    name: z.name,
    order: z.order,
    active: z.active,
    createdAt: z.createdAt,
    updatedAt: z.updatedAt,
  };
}

function mapPrismaTable(t: PrismaTableResult): TableWithSession {
  const currentSession = t.sessions?.find((s) => s.current === true);
  return {
    id: t.id,
    companyId: t.companyId,
    number: t.number,
    label: t.label,
    capacity: t.capacity,
    zoneId: t.zoneId,
    zone: t.zone ? mapPrismaZone(t.zone) : undefined,
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
    console.error("findZones error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function findZone(id: string, companyId: string): Promise<response<Zone>> {
  try {
    const zone = await prisma().zone.findFirst({ where: { id, companyId } });
    if (!zone) return { success: false, message: "Zona no encontrada" };
    return { success: true, data: zone };
  } catch (e: any) {
    console.error("findZone error:", e);
    return { success: false, message: "Error interno del servidor" };
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
    console.error("createZone error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function updateZone(id: string, companyId: string, data: { name?: string; order?: number }): Promise<response<Zone>> {
  try {
    const existing = await prisma().zone.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false, message: "Zona no encontrada" };
    const zone = await prisma().zone.update({
      where: { id },
      data: { ...data },
    });
    return { success: true, data: zone };
  } catch (e: any) {
    if (e.code === "P2002") {
      return { success: false, message: "Ya existe una zona con ese nombre" };
    }
    console.error("updateZone error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function deleteZone(id: string, companyId: string): Promise<response<void>> {
  try {
    const existing = await prisma().zone.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false, message: "Zona no encontrada" };
    const activeTables = await prisma().table.count({
      where: { zoneId: id, companyId, active: true },
    });
    if (activeTables > 0) {
      return { success: false, message: "No se puede eliminar una zona con mesas activas" };
    }
    await prisma().zone.update({ where: { id }, data: { active: false } });
    return { success: true, data: undefined };
  } catch (e: any) {
    console.error("deleteZone error:", e);
    return { success: false, message: "Error interno del servidor" };
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
            order: { include: { orderItems: { select: { round: true } } } },
          },
        },
      },
      orderBy: { number: "asc" },
    });
    return { success: true, data: tables.map(mapPrismaTable) };
  } catch (e: any) {
    console.error("findTables error:", e);
    return { success: false, message: "Error interno del servidor" };
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
    console.error("findTable error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function createTable(companyId: string, data: { number: number; label?: string; capacity: number; zoneId: string }): Promise<response<Table>> {
  try {
    // Validate zone belongs to same company
    const zone = await prisma().zone.findFirst({ where: { id: data.zoneId, companyId } });
    if (!zone) return { success: false, message: "Zona no encontrada" };

    const table = await prisma().table.create({
      data: { companyId, ...data, label: data.label || null },
    });
    return { success: true, data: { ...table, activeSession: null } };
  } catch (e: any) {
    if (e.code === "P2002") {
      return { success: false, message: "Ya existe una mesa con ese numero" };
    }
    console.error("createTable error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function updateTable(id: string, companyId: string, data: { number?: number; label?: string; capacity?: number; zoneId?: string }): Promise<response<Table>> {
  try {
    const existing = await prisma().table.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false, message: "Mesa no encontrada" };

    // Validate zone belongs to same company if zoneId is being updated
    if (data.zoneId) {
      const zone = await prisma().zone.findFirst({ where: { id: data.zoneId, companyId } });
      if (!zone) return { success: false, message: "Zona no encontrada" };
    }

    const updateData: Record<string, any> = {};
    if (data.number !== undefined) updateData.number = data.number;
    if (data.label !== undefined) updateData.label = data.label || null;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.zoneId !== undefined) updateData.zoneId = data.zoneId;

    const table = await prisma().table.update({
      where: { id },
      data: updateData,
    });
    return { success: true, data: { ...table, activeSession: null } };
  } catch (e: any) {
    if (e.code === "P2002") {
      return { success: false, message: "Ya existe una mesa con ese numero" };
    }
    console.error("updateTable error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function deleteTable(id: string, companyId: string): Promise<response<void>> {
  try {
    const existing = await prisma().table.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false, message: "Mesa no encontrada" };
    const activeSessions = await prisma().tableSession.count({
      where: { tableId: id, current: true },
    });
    if (activeSessions > 0) {
      return { success: false, message: "No se puede eliminar una mesa con sesion activa" };
    }
    await prisma().table.update({ where: { id }, data: { active: false } });
    return { success: true, data: undefined };
  } catch (e: any) {
    console.error("deleteTable error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

// -- Table Session --

export async function findActiveSession(tableId: string, companyId: string): Promise<response<TableSession>> {
  try {
    const session = await prisma().tableSession.findFirst({
      where: { tableId, companyId, current: true },
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
    console.error("findActiveSession error:", e);
    return { success: false, message: "Error interno del servidor" };
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
    console.error("createSession error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function updateSessionStatus(
  sessionId: string,
  companyId: string,
  status: "OPEN" | "BILL_REQUESTED" | "CLOSED" | "CANCELLED",
): Promise<response<TableSession>> {
  try {
    const existing = await prisma().tableSession.findFirst({ where: { id: sessionId, companyId } });
    if (!existing) return { success: false, message: "Sesion no encontrada" };
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
    console.error("updateSessionStatus error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function updateSessionWaiter(
  sessionId: string,
  companyId: string,
  newWaiterId: string,
): Promise<response<TableSession>> {
  try {
    const existing = await prisma().tableSession.findFirst({ where: { id: sessionId, companyId } });
    if (!existing) return { success: false, message: "Sesion no encontrada" };
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
    console.error("updateSessionWaiter error:", e);
    return { success: false, message: "Error interno del servidor" };
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
    console.error("createDineInOrder error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function getOrderBySessionId(sessionId: string, companyId: string): Promise<response<{ id: string; orderItems: Array<{ round: number }> }>> {
  try {
    const order = await prisma().order.findFirst({
      where: {
        tableSessionId: sessionId,
        tableSession: { companyId },
      },
      include: {
        orderItems: {
          select: { round: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!order) return { success: false, message: "Orden no encontrada" };
    return { success: true, data: { id: order.id, orderItems: order.orderItems } };
  } catch (e: any) {
    console.error("getOrderBySessionId error:", e);
    return { success: false, message: "Error interno del servidor" };
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

    // Update order totals using aggregate
    const { _sum } = await prisma().orderItem.aggregate({
      where: { orderId },
      _sum: { total: true },
    });
    const total = _sum.total?.toNumber() ?? 0;
    await prisma().order.update({
      where: { id: orderId },
      data: { total, netTotal: total },
    });

    return { success: true, data: undefined };
  } catch (e: any) {
    console.error("addOrderItems error:", e);
    return { success: false, message: "Error interno del servidor" };
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
    console.error("getWaiters error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function findProductsByIds(
  productIds: string[],
  companyId: string,
): Promise<response<Array<{ id: string; price: number; name: string }>>> {
  try {
    const products = await prisma().product.findMany({
      where: { id: { in: productIds }, companyId, hidden: false },
      select: { id: true, price: true, name: true },
    });
    return {
      success: true,
      data: products.map((p) => ({ id: p.id, price: p.price.toNumber(), name: p.name })),
    };
  } catch (e: any) {
    console.error("findProductsByIds error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function findUserByIdAndCompany(
  userId: string,
  companyId: string,
): Promise<response<{ id: string; name: string | null }>> {
  try {
    const user = await prisma().user.findFirst({
      where: { id: userId, companyId, active: true },
      select: { id: true, name: true },
    });
    if (!user) return { success: false, message: "Usuario no encontrado" };
    return { success: true, data: user };
  } catch (e: any) {
    console.error("findUserByIdAndCompany error:", e);
    return { success: false, message: "Error interno del servidor" };
  }
}
