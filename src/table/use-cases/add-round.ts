import type { response } from "@/lib/types";
import { findActiveSession, getOrderBySessionId, addOrderItems } from "../db_repository";

export type RoundItem = {
  productId: string;
  quantity: number;
  productPrice: number;
  notes?: string;
};

export async function addRound(
  tableId: string,
  items: RoundItem[],
): Promise<response<{ orderId: string; round: number }>> {
  if (items.length === 0) {
    return { success: false, message: "Debes agregar al menos un producto" };
  }

  const sessionResponse = await findActiveSession(tableId);
  if (!sessionResponse.success) return sessionResponse;

  const session = sessionResponse.data;
  if (session.status !== "OPEN") {
    return { success: false, message: "Solo se pueden agregar items a una sesion abierta" };
  }

  if (!session.orderId) {
    return { success: false, message: "No se encontro la orden de esta sesion" };
  }

  // Get current max round
  const orderResponse = await getOrderBySessionId(session.id);
  if (!orderResponse.success) return orderResponse;

  const maxRound = orderResponse.data.orderItems.length > 0
    ? Math.max(...orderResponse.data.orderItems.map((oi: any) => oi.round ?? 1))
    : 0;
  const nextRound = maxRound + 1;

  const addResponse = await addOrderItems(orderResponse.data.id, nextRound, items);
  if (!addResponse.success) return addResponse;

  return { success: true, data: { orderId: orderResponse.data.id, round: nextRound } };
}
