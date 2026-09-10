import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import type { KitchenItem } from "./types";

export async function findKitchenItems(
  companyId: string,
): Promise<response<KitchenItem[]>> {
  try {
    const items = await prisma().orderItem.findMany({
      where: {
        order: {
          companyId,
          status: "PENDING",
          tableSession: { current: true, status: "OPEN" },
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
        productName: item.product.name,
        quantity: Number(item.quantity),
        notes: item.notes,
        round: item.round,
        tableLabel:
          item.order.tableSession?.table.label ||
          String(item.order.tableSession?.table.number),
        status: item.kitchenStatus,
        cancellationReason: item.cancellationReason,
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
}): Promise<response<void>> {
  try {
    const result = await prisma().orderItem.updateMany({
      where: {
        id: input.orderItemId,
        kitchenStatus: "PENDING",
        order: {
          companyId: input.companyId,
          status: "PENDING",
          tableSession: { current: true, status: "OPEN" },
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
