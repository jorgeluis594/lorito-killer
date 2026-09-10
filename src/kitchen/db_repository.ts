import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { UserRole } from "@/authorization/types";
import type { response } from "@/lib/types";
import type { KitchenItem } from "./types";

function stationFilter(role: UserRole): Prisma.OrderItemWhereInput {
  if (role === "ADMIN") return {};
  if (role === "KITCHEN") return { preparationStation: "KITCHEN" };
  if (role === "BARTENDER") return { preparationStation: "BAR" };
  return { id: { in: [] } };
}

export async function findKitchenItems(
  companyId: string,
  role: UserRole,
): Promise<response<KitchenItem[]>> {
  try {
    const items = await prisma().orderItem.findMany({
      where: {
        ...stationFilter(role),
        order: {
          companyId,
          status: "PENDING",
          tableSession: {
            current: true,
            status: { in: ["OPEN", "BILL_REQUESTED"] },
          },
        },
      },
      include: {
        product: { select: { name: true } },
        order: { include: { tableSession: { include: { table: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: items.map((item) => ({
        id: item.id,
        preparationStation: item.preparationStation,
        productName: item.product.name,
        quantity: Number(item.quantity),
        notes: item.notes,
        round: item.round,
        tableLabel:
          item.order.tableSession?.table.label ||
          String(item.order.tableSession?.table.number),
        status: item.kitchenStatus,
        cancellationReason: item.cancellationReason,
        kitchenReadyAt: item.kitchenReadyAt,
        createdAt: item.createdAt,
      })),
    };
  } catch (error) {
    console.error("findKitchenItems error:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function takePendingOrderItem(input: {
  orderItemId: string;
  companyId: string;
  userId: string;
  role: UserRole;
}): Promise<response<void>> {
  try {
    const result = await prisma().orderItem.updateMany({
      where: {
        id: input.orderItemId,
        AND: stationFilter(input.role),
        kitchenStatus: "PENDING",
        order: {
          companyId: input.companyId,
          status: "PENDING",
          tableSession: {
            current: true,
            status: { in: ["OPEN", "BILL_REQUESTED"] },
          },
        },
      },
      data: {
        kitchenStatus: "PREPARING",
        kitchenTakenAt: new Date(),
        kitchenTakenById: input.userId,
      },
    });

    return result.count === 1
      ? { success: true, data: undefined }
      : { success: false, message: "El producto ya no esta pendiente" };
  } catch (error) {
    console.error("takePendingOrderItem error:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function markPreparingOrderItemReady(input: {
  orderItemId: string;
  companyId: string;
  userId: string;
  role: UserRole;
}): Promise<response<void>> {
  try {
    const result = await prisma().orderItem.updateMany({
      where: {
        id: input.orderItemId,
        AND: stationFilter(input.role),
        kitchenStatus: "PREPARING",
        order: {
          companyId: input.companyId,
          status: "PENDING",
          tableSession: {
            current: true,
            status: { in: ["OPEN", "BILL_REQUESTED"] },
          },
        },
      },
      data: {
        kitchenStatus: "READY",
        kitchenReadyAt: new Date(),
        kitchenReadyById: input.userId,
      },
    });

    return result.count === 1
      ? { success: true, data: undefined }
      : { success: false, message: "Solo un producto en preparacion puede marcarse listo" };
  } catch (error) {
    console.error("markPreparingOrderItemReady error:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function serveReadyRound(input: {
  tableId: string;
  round: number;
  companyId: string;
  userId: string;
}): Promise<response<void>> {
  try {
    return await prisma().$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          companyId: input.companyId,
          status: "PENDING",
          tableSession: {
            tableId: input.tableId,
            current: true,
            status: { in: ["OPEN", "BILL_REQUESTED"] },
          },
        },
        select: {
          id: true,
          orderItems: {
            where: {
              round: input.round,
              kitchenStatus: { not: "CANCELLED" },
            },
            select: { kitchenStatus: true },
          },
        },
      });

      if (
        !order ||
        order.orderItems.length === 0 ||
        !order.orderItems.every((item) => item.kitchenStatus === "READY")
      ) {
        return { success: false, message: "Solo una comanda lista puede marcarse servida" };
      }

      const served = await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          round: input.round,
          kitchenStatus: "READY",
        },
        data: {
          kitchenStatus: "SERVED",
          servedAt: new Date(),
          servedById: input.userId,
        },
      });

      return served.count === order.orderItems.length
        ? { success: true, data: undefined }
        : { success: false, message: "La comanda ya fue servida" };
    });
  } catch (error) {
    console.error("serveReadyRound error:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}
