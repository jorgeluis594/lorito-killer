import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import { recalculateOrderTotals } from "@/order/recalculate-order-totals";
import { log } from "@/lib/log";
import { closeServiceSession } from "@/table/payment-repository";
import { getDeliveryTransition } from "./use-cases/delivery-transition";
import { describeUnpaidFulfillmentOrder } from "./use-cases/describe-unpaid-fulfillment-order";
import { planDeliveryEdit } from "./use-cases/plan-delivery-edit";
import { limaDayRange, todayInLima } from "./use-cases/lima-day";
import {
  validateDeliveryDetails,
  type DeliveryDetails,
} from "./use-cases/validate-delivery-details";
import type { UpdateDeliveryDetailsInput } from "./schemas";
import type { SaveCustomerNameResult } from "./types";
import { decideCustomerNameSave } from "./use-cases/decide-customer-name-save";
import {
  describeServiceOrder,
  toServiceOrderIdentity,
} from "./use-cases/describe-service-order";

const isSerializationConflict = (error: unknown) => {
  const code = (error as { code?: string }).code;
  return (
    code === "P2034" ||
    (code === "P2010" &&
      (error as { meta?: { code?: string } }).meta?.code === "40001")
  );
};

class EditRejected extends Error {}

type OpenServiceSessionResult = {
  sessionId: string;
  /** La clave del intento ya había creado el pedido. */
  replayed: boolean;
  /** El pedido del intento ya se cerró (liberado o entregado). */
  closed: boolean;
};

const isSessionPrimaryKeyConflict = (error: unknown) => {
  const { code, meta } = error as {
    code?: string;
    meta?: { modelName?: string; target?: unknown };
  };
  if (code !== "P2002" || meta?.modelName !== "TableSession") return false;
  const target = meta.target;
  return Array.isArray(target)
    ? target.length === 1 && target[0] === "id"
    : target === "TableSession_pkey";
};

/**
 * Abre una sesión sin mesa: delivery si trae datos de entrega, para llevar si
 * no. Se pueden abrir todas las que haga falta a la vez. Con `sessionId` (la
 * clave del intento) repetir la apertura devuelve la sesión ya creada.
 */
export async function openServiceSession(input: {
  companyId: string;
  userId: string;
  sessionId?: string;
  customerName?: string | null;
  delivery: DeliveryDetails | null;
}): Promise<response<OpenServiceSessionResult>> {
  let stage: "create" | "replay" = "create";
  try {
    const sessionId = await prisma().$transaction(async (db) => {
      const session = await db.tableSession.create({
        data: {
          ...(input.sessionId ? { id: input.sessionId } : {}),
          companyId: input.companyId,
          waiterId: input.userId,
          // Solo Para llevar: Delivery guarda su nombre en Delivery.name.
          ...(input.delivery
            ? {}
            : { customerName: input.customerName ?? null }),
          order: {
            create: {
              companyId: input.companyId,
              orderType: input.delivery ? "DELIVERY" : "TAKE_AWAY",
              status: "PENDING",
              discountAmount: 0,
              netTotal: 0,
              total: 0,
              ...(input.delivery
                ? {
                    delivery: {
                      create: { ...input.delivery, createdById: input.userId },
                    },
                  }
                : {}),
            },
          },
        },
        include: { order: { select: { id: true } } },
      });
      await recalculateOrderTotals(db, session.order!.id);
      return session.id;
    });
    return {
      success: true,
      data: { sessionId, replayed: false, closed: false },
    };
  } catch (error) {
    const meta = (error as { meta?: { target?: unknown } }).meta;
    if (input.sessionId && isSessionPrimaryKeyConflict(error)) {
      stage = "replay";
      try {
        // Fuera de la transacción abortada: la clave de otra empresa no se revela.
        const existing = await prisma().tableSession.findFirst({
          where: {
            id: input.sessionId,
            companyId: input.companyId,
            tableId: null,
          },
          select: { current: true, order: { select: { orderType: true } } },
        });
        if (existing?.order?.orderType === "TAKE_AWAY")
          return {
            success: true,
            data: {
              sessionId: input.sessionId,
              replayed: true,
              closed: existing.current === null,
            },
          };
      } catch (replayError) {
        error = replayError;
      }
    }
    log.error("service_order_open_failed", {
      companyId: input.companyId,
      userId: input.userId,
      sessionId: input.sessionId,
      channel: input.delivery ? "DELIVERY" : "TAKE_AWAY",
      stage,
      code: (error as { code?: string }).code,
      target: meta?.target,
    });
    return {
      success: false,
      message: "No se pudo crear el pedido. Vuelve a intentarlo.",
    };
  }
}

/**
 * Renombra un Para llevar. Toma la fila de la sesión con `FOR UPDATE` en
 * `ReadCommitted`: espera a los flujos `Serializable` que la escriben y nunca
 * recibe 40001. No toca `Order.updatedAt` ni `draftRevision`.
 */
export async function updateTakeAwayCustomerName(
  companyId: string,
  input: {
    sessionId: string;
    customerName: string | null;
    expectedName: string | null;
  },
): Promise<SaveCustomerNameResult> {
  try {
    return await prisma().$transaction(
      async (db) => {
        await db.$queryRaw`SELECT id FROM "TableSession" WHERE id = ${input.sessionId} AND "companyId" = ${companyId} FOR UPDATE`;
        const session = await db.tableSession.findFirst({
          where: { id: input.sessionId, companyId },
          select: {
            tableId: true,
            current: true,
            customerName: true,
            order: { select: { orderType: true } },
          },
        });
        if (
          !session ||
          session.tableId !== null ||
          session.order?.orderType !== "TAKE_AWAY"
        )
          return {
            success: false as const,
            type: "SessionUnavailable" as const,
            message: "Este pedido ya no está disponible.",
          };
        if (session.current === null)
          return {
            success: false as const,
            type: "SessionClosed" as const,
            message: "Este pedido ya se cerró.",
          };
        const decision = decideCustomerNameSave({
          current: session.customerName,
          expected: input.expectedName,
          next: input.customerName,
        });
        if (decision.kind === "conflict")
          return {
            success: false as const,
            type: "CustomerNameConflict" as const,
            message: decision.current
              ? `Otro dispositivo cambió el nombre a ${decision.current}. Revisa y vuelve a guardar.`
              : "Otro dispositivo quitó el nombre. Revisa y vuelve a guardar.",
            currentName: decision.current,
          };
        if (decision.kind === "save")
          await db.tableSession.update({
            where: { id: input.sessionId },
            data: { customerName: input.customerName },
          });
        return {
          success: true as const,
          data: {
            sessionId: input.sessionId,
            customerName: input.customerName,
            changed: decision.kind === "save",
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        // Puede esperar el FOR UPDATE de payTable (hasta 15 s).
        timeout: 20000,
      },
    );
  } catch (error) {
    log.error("take_away_customer_name_save_failed", {
      companyId,
      sessionId: input.sessionId,
      code: (error as { code?: string }).code,
    });
    return {
      success: false,
      message: "No se pudo guardar el nombre. Vuelve a intentarlo.",
    };
  }
}

/**
 * Despacha o entrega. Entregar no exige cobro; si el pedido ya está cobrado,
 * la entrega cierra la sesión (equivale a liberar la mesa).
 */
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
    closed: boolean;
  }>
> {
  try {
    return await prisma().$transaction(
      async (db) => {
        await db.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
        const order = await db.order.findFirst({
          where: { id: orderId, companyId, orderType: "DELIVERY" },
          include: { delivery: true, tableSession: true },
        });
        if (!order?.delivery)
          return { success: false, message: "El pedido no está disponible." };
        if (order.status === "CANCELLED")
          return { success: false, message: "El pedido fue cancelado." };
        const transition = getDeliveryTransition(order.delivery.status, action);
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
        }
        const closed =
          transition.data === "DELIVERED" &&
          order.paymentStatus === "PAID" &&
          !!order.tableSession?.current;
        if (closed)
          await closeServiceSession(db, order.tableSession!.id, orderId);
        return {
          success: true,
          data: { orderId, status: transition.data, closed },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const transient = isSerializationConflict(error);
    // Un conflicto con un cobro o edición concurrente se reintenta de forma
    // acotada: la nueva transacción relee el pedido ya cambiado.
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

export type UnpaidFulfillmentOrder = {
  orderId: string;
  sessionId: string | null;
  orderType: "TAKE_AWAY" | "DELIVERY";
  orderLabel: string;
  statusLabel: string;
  total: number;
  createdAt: Date;
};

// Por empresa y no por turno: un pedido sin cobrar todavía no pertenece a
// ninguna caja, así que se incluyen los creados en turnos anteriores.
export async function listUnpaidFulfillmentOrders(
  companyId: string,
): Promise<response<UnpaidFulfillmentOrder[]>> {
  try {
    const orders = await prisma().order.findMany({
      where: {
        companyId,
        orderType: { in: ["TAKE_AWAY", "DELIVERY"] },
        paymentStatus: "PENDING",
        status: { not: "CANCELLED" },
        // Una sesión abierta sin productos aún no es un pedido.
        orderItems: { some: { quantity: { gt: 0 } } },
      },
      select: {
        id: true,
        tableSessionId: true,
        orderType: true,
        total: true,
        createdAt: true,
        delivery: { select: { name: true, phone: true, status: true } },
        tableSession: { select: { openedAt: true, customerName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return {
      success: true,
      data: orders.map((order) => ({
        orderId: order.id,
        sessionId: order.tableSessionId,
        orderType: order.orderType as "TAKE_AWAY" | "DELIVERY",
        ...describeUnpaidFulfillmentOrder({
          identity: toServiceOrderIdentity({
            orderType: order.orderType,
            sessionCustomerName: order.tableSession?.customerName,
            delivery: order.delivery,
            openedAt: order.tableSession?.openedAt ?? order.createdAt,
          })!,
          deliveryStatus: order.delivery?.status ?? null,
        }),
        total: order.total.toNumber(),
        createdAt: order.createdAt,
      })),
    };
  } catch {
    return {
      success: false,
      message: "No se pudieron consultar los pedidos sin cobrar.",
    };
  }
}

export type UpdateDeliveryDetailsResult = {
  orderId: string;
  updatedAt: string;
  total: number;
};

/**
 * Edita contacto y, mientras no haya comprobante, envío. Bloquea Order, relee
 * documento y versión bajo el bloqueo y deja `Order.total` coherente con el
 * envío en la misma transacción. Un rechazo revierte todo.
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
            "El pedido cambió en otro dispositivo. Cierra esta ventana para ver los datos vigentes.",
          );

        const locked =
          order.documents.length > 0 || order.paymentStatus === "PAID";
        const plan = planDeliveryEdit(
          { fee: order.delivery.fee.toNumber() },
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
            ...(locked ? {} : { fee: next.fee }),
          },
        });

        const total = locked
          ? order.total.toNumber()
          : (await recalculateOrderTotals(db, order.id)).total.toNumber();
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
    if (isSerializationConflict(error) && attempt < 2)
      return updateDeliveryDetails(companyId, input, attempt + 1);
    return {
      success: false,
      message: isSerializationConflict(error)
        ? "El pedido cambió. Vuelve a intentarlo."
        : "No se pudo guardar la edición.",
    };
  }
}

export type DeliveredItem = {
  sessionId: string;
  orderId: string;
  title: string;
  address: string | null;
  total: number;
  closedAt: Date;
};

function deliveredTitle(
  session: { openedAt: Date; customerName: string | null },
  order: {
    orderType: string;
    delivery: { name: string | null; phone: string } | null;
  },
) {
  const identity = toServiceOrderIdentity({
    orderType: order.orderType,
    sessionCustomerName: session.customerName,
    delivery: order.delivery,
    openedAt: session.openedAt,
  });
  return identity ? describeServiceOrder(identity).summaryLabel : "Para llevar";
}

/** Deliveries y pedidos para llevar cerrados hoy (hora de Lima). */
export async function listDeliveredToday(
  companyId: string,
  now: Date = new Date(),
): Promise<response<DeliveredItem[]>> {
  try {
    const { from, to } = limaDayRange(todayInLima(now));
    const sessions = await prisma().tableSession.findMany({
      where: {
        companyId,
        tableId: null,
        status: "CLOSED",
        closedAt: { gte: from, lt: to },
      },
      include: {
        order: {
          select: {
            id: true,
            total: true,
            orderType: true,
            delivery: { select: { name: true, phone: true, address: true } },
          },
        },
      },
      orderBy: { closedAt: "desc" },
    });
    return {
      success: true,
      data: sessions.flatMap((session) =>
        session.order
          ? [
              {
                sessionId: session.id,
                orderId: session.order.id,
                title: deliveredTitle(session, session.order),
                address: session.order.delivery?.address ?? null,
                total: session.order.total.toNumber(),
                closedAt: session.closedAt!,
              },
            ]
          : [],
      ),
    };
  } catch {
    return {
      success: false,
      message: "No se pudieron cargar los pedidos entregados.",
    };
  }
}
