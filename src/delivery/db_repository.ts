import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import { getDeliveryTransition } from "./use-cases/delivery-transition";

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
  return prisma().delivery.findFirst({
    where: { orderId, order: { companyId } },
    select: {
      status: true,
      dispatchedAt: true,
      deliveredAt: true,
      dispatchedBy: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
  });
}
