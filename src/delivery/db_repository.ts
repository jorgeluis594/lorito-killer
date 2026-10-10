import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import { recalculateOrderTotals } from "@/order/recalculate-order-totals";
import { getDeliveryTransition } from "./use-cases/delivery-transition";
import { isDeliveryOverdue } from "./use-cases/is-delivery-overdue";
import { planDeliveryEdit } from "./use-cases/plan-delivery-edit";
import {
  CASH_PAYS_WITH_BELOW_TOTAL_MESSAGE,
  coversTotal,
  validateDeliveryDetails,
} from "./use-cases/validate-delivery-details";
import {
  DELIVERY_LIST_PAGE_SIZE,
  type DeliveryListFilters,
  type UpdateDeliveryDetailsInput,
} from "./schemas";

const isSerializationConflict = (error: unknown) => {
  const code = (error as { code?: string }).code;
  return (
    code === "P2034" ||
    (code === "P2010" &&
      (error as { meta?: { code?: string } }).meta?.code === "40001")
  );
};

class EditRejected extends Error {}

export async function transitionDelivery(
  companyId: string,
  userId: string,
  orderId: string,
  action: "DISPATCH" | "DELIVER",
  attempt = 0,
): Promise<
  response<{
    orderId: string;
    status: "PENDING" | "DISPATCHED" | "DELIVERED";
    paymentStatus: "PENDING" | "PAID";
  }>
> {
  try {
    return await prisma().$transaction(
      async (db) => {
        await db.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
        const order = await db.order.findFirst({
          where: { id: orderId, companyId, orderType: "DELIVERY" },
          include: { delivery: true },
        });
        if (!order?.delivery)
          return { success: false, message: "El pedido no está disponible." };
        if (order.status === "CANCELLED")
          return { success: false, message: "El pedido fue cancelado." };
        const transition = getDeliveryTransition(
          order.delivery.status,
          action,
          order.paymentStatus,
        );
        if (!transition.success) return transition;
        if (transition.data !== order.delivery.status) {
          const now = new Date();
          await db.delivery.update({
            where: { orderId },
            data:
              action === "DISPATCH"
                ? {
                    status: "DISPATCHED",
                    dispatchedAt: now,
                    dispatchedById: userId,
                  }
                : {
                    status: "DELIVERED",
                    deliveredAt: now,
                    deliveredById: userId,
                  },
          });
          if (action === "DELIVER")
            await db.order.update({
              where: { id: orderId },
              data: { status: "COMPLETED" },
            });
        }
        return {
          success: true,
          data: {
            orderId,
            status: transition.data,
            paymentStatus: order.paymentStatus,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    const transient =
      code === "P2034" ||
      (code === "P2010" &&
        (error as { meta?: { code?: string } }).meta?.code === "40001");
    // Un conflicto de serialización con una edición concurrente se reintenta
    // de forma acotada: la nueva transacción relee el pedido ya editado.
    if (transient && attempt < 2)
      return transitionDelivery(
        companyId,
        userId,
        orderId,
        action,
        attempt + 1,
      );
    return {
      success: false,
      message: transient
        ? "El pedido cambió. Consulta su estado antes de reintentar."
        : "No se pudo actualizar el pedido.",
    };
  }
}

export async function completeTakeAway(companyId: string, orderId: string) {
  const updated = await prisma().order.updateMany({
    where: {
      id: orderId,
      companyId,
      orderType: "TAKE_AWAY",
      status: "PENDING",
      paymentStatus: "PAID",
    },
    data: { status: "COMPLETED" },
  });
  if (updated.count === 1)
    return {
      success: true as const,
      data: { orderId, status: "COMPLETED" as const },
    };
  const existing = await prisma().order.findFirst({
    where: { id: orderId, companyId, orderType: "TAKE_AWAY" },
  });
  return existing?.status === "COMPLETED"
    ? {
        success: true as const,
        data: { orderId, status: "COMPLETED" as const },
      }
    : {
        success: false as const,
        message: "El pedido debe estar pagado antes de entregarlo.",
      };
}

export async function getDeliveryDetails(companyId: string, orderId: string) {
  const delivery = await prisma().delivery.findFirst({
    where: { orderId, order: { companyId } },
    select: {
      status: true,
      name: true,
      phone: true,
      address: true,
      reference: true,
      fee: true,
      expectedPaymentMethod: true,
      cashPaysWith: true,
      dispatchedAt: true,
      deliveredAt: true,
      dispatchedBy: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
  });
  return delivery
    ? {
        ...delivery,
        fee: delivery.fee.toNumber(),
        cashPaysWith: delivery.cashPaysWith?.toNumber() ?? null,
      }
    : null;
}

export type UpdateDeliveryDetailsResult = {
  orderId: string;
  updatedAt: string;
  total: number;
};

/**
 * Edita contacto y, mientras no haya comprobante, envío, medio esperado y
 * “paga con”. Bloquea Order, relee documento y versión bajo el bloqueo y deja
 * `Order.total` coherente con el envío en la misma transacción. Cualquier
 * rechazo revierte todo: la solicitud se guarda completa o no se guarda.
 */
export async function updateDeliveryDetails(
  companyId: string,
  input: UpdateDeliveryDetailsInput,
  attempt = 0,
): Promise<response<UpdateDeliveryDetailsResult>> {
  const shape = validateDeliveryDetails(input);
  if (!shape.success) return { success: false, message: shape.message };
  const next = shape.data;
  try {
    return await prisma().$transaction(
      async (db) => {
        await db.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
        const order = await db.order.findFirst({
          where: { id: input.orderId, companyId, orderType: "DELIVERY" },
          include: { delivery: true, documents: { select: { id: true } } },
        });
        if (!order?.delivery)
          throw new EditRejected("El pedido no está disponible.");
        if (order.status === "CANCELLED")
          throw new EditRejected("El pedido fue cancelado.");
        if (order.updatedAt.toISOString() !== input.updatedAt)
          throw new EditRejected(
            "El pedido cambió desde que abriste la pantalla. Recarga la página para ver los datos vigentes.",
          );

        const current = order.delivery;
        const locked =
          order.documents.length > 0 || order.paymentStatus === "PAID";
        const plan = planDeliveryEdit(
          {
            name: current.name,
            phone: current.phone,
            address: current.address,
            reference: current.reference,
            fee: current.fee.toNumber(),
            expectedPaymentMethod: current.expectedPaymentMethod,
            cashPaysWith: current.cashPaysWith?.toNumber() ?? null,
          },
          next,
          locked,
        );
        if (!plan.success) throw new EditRejected(plan.message);

        await db.delivery.update({
          where: { orderId: order.id },
          data: {
            name: next.name,
            phone: next.phone,
            address: next.address,
            reference: next.reference,
            ...(locked
              ? {}
              : {
                  fee: next.fee,
                  expectedPaymentMethod: next.expectedPaymentMethod,
                  cashPaysWith: next.cashPaysWith,
                }),
          },
        });

        let total = order.total.toNumber();
        if (!locked) {
          const totals = await recalculateOrderTotals(db, order.id);
          total = totals.total.toNumber();
          if (
            next.cashPaysWith !== null &&
            !coversTotal(next.cashPaysWith, total)
          )
            throw new EditRejected(CASH_PAYS_WITH_BELOW_TOTAL_MESSAGE);
        }
        // Toda edición, también la de contacto, cambia la versión del pedido.
        const touched = await db.order.update({
          where: { id: order.id },
          data: { updatedAt: new Date() },
          select: { updatedAt: true },
        });
        return {
          success: true as const,
          data: {
            orderId: order.id,
            updatedAt: touched.updatedAt.toISOString(),
            total,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof EditRejected)
      return { success: false, message: error.message };
    // Un cobro o despacho concurrente ganó la carrera: se relee el pedido ya
    // cambiado y se decide de nuevo, de forma acotada.
    if (isSerializationConflict(error) && attempt < 2)
      return updateDeliveryDetails(companyId, input, attempt + 1);
    return {
      success: false,
      message: isSerializationConflict(error)
        ? "El pedido cambió. Recarga la página antes de reintentar."
        : "No se pudo guardar la edición.",
    };
  }
}

const LIMA_OFFSET = "-05:00";

/** Rango [inicio, fin) de un día calendario de Lima (sin horario de verano). */
export function limaDayRange(date: string): { from: Date; to: Date } {
  const from = new Date(`${date}T00:00:00.000${LIMA_OFFSET}`);
  return { from, to: new Date(from.getTime() + 24 * 60 * 60 * 1000) };
}

export function todayInLima(now: Date = new Date()): string {
  return new Date(now.getTime() - 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export type DeliveryListItem = {
  orderId: string;
  name: string;
  phone: string;
  address: string;
  total: number;
  status: "PENDING" | "DISPATCHED" | "DELIVERED";
  paymentStatus: "PENDING" | "PAID";
  createdAt: string;
  dispatchedAt: string | null;
  isOverdue: boolean;
};

export async function listDeliveryOrders(
  companyId: string,
  filters: DeliveryListFilters = {},
  now: Date = new Date(),
): Promise<response<{ items: DeliveryListItem[]; nextCursor: string | null }>> {
  const date = filters.date ?? todayInLima(now);
  if (Number.isNaN(Date.parse(`${date}T00:00:00Z`)))
    return { success: false, message: "La fecha no es válida." };
  const { from, to } = limaDayRange(date);
  const search = filters.search?.trim();
  const digits = search?.replace(/\D/g, "");
  const rows = await prisma().delivery.findMany({
    where: {
      status: filters.status ?? { in: ["PENDING", "DISPATCHED"] },
      order: {
        companyId,
        orderType: "DELIVERY",
        status: { not: "CANCELLED" },
        createdAt: { gte: from, lt: to },
      },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              ...(digits ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    },
    orderBy: [{ order: { createdAt: "desc" } }, { orderId: "desc" }],
    take: DELIVERY_LIST_PAGE_SIZE + 1,
    ...(filters.cursor ? { cursor: { orderId: filters.cursor }, skip: 1 } : {}),
    include: {
      order: {
        select: { total: true, paymentStatus: true, createdAt: true },
      },
    },
  });
  const page = rows.slice(0, DELIVERY_LIST_PAGE_SIZE);
  return {
    success: true,
    data: {
      items: page.map((row) => ({
        orderId: row.orderId,
        name: row.name,
        phone: row.phone,
        address: row.address,
        total: row.order.total.toNumber(),
        status: row.status,
        paymentStatus: row.order.paymentStatus,
        createdAt: row.order.createdAt.toISOString(),
        dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
        isOverdue: isDeliveryOverdue(row, now),
      })),
      nextCursor:
        rows.length > DELIVERY_LIST_PAGE_SIZE
          ? page[page.length - 1].orderId
          : null,
    },
  };
}
