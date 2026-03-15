import type { response } from "@/lib/types";
import { findActiveSession, addOrderItems, findProductsByIds } from "../db_repository";

export type RoundItem = {
  productId: string;
  quantity: number;
  notes?: string;
};

export async function addRound(
  tableId: string,
  companyId: string,
  items: RoundItem[],
): Promise<response<{ orderId: string; round: number }>> {
  if (items.length === 0) {
    return { success: false, message: "Debes agregar al menos un producto" };
  }

  const sessionResponse = await findActiveSession(tableId, companyId);
  if (!sessionResponse.success) return sessionResponse;

  const session = sessionResponse.data;
  if (session.status !== "OPEN") {
    return { success: false, message: "Solo se pueden agregar items a una sesion abierta" };
  }

  if (!session.orderId) {
    return { success: false, message: "No se encontro la orden de esta sesion" };
  }

  // Server-side price validation: look up actual prices from DB
  const productIds = items.map((i) => i.productId);
  const productsResponse = await findProductsByIds(productIds, companyId);
  if (!productsResponse.success) return productsResponse;

  const productMap = new Map(productsResponse.data.map((p) => [p.id, p]));

  // Verify all products exist and belong to the company
  for (const item of items) {
    if (!productMap.has(item.productId)) {
      return { success: false, message: `Producto no encontrado: ${item.productId}` };
    }
  }

  // Use currentRound from session directly (eliminates redundant query)
  const nextRound = session.currentRound + 1;

  // Build items with DB-verified prices
  const verifiedItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    productPrice: productMap.get(item.productId)!.price,
    notes: item.notes,
  }));

  const addResponse = await addOrderItems(session.orderId, nextRound, verifiedItems);
  if (!addResponse.success) return addResponse;

  return { success: true, data: { orderId: session.orderId, round: nextRound } };
}
