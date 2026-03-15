import type { response } from "@/lib/types";
import type { TableSession } from "../types";
import { findActiveSession, updateSessionStatus, getOrderBySessionId } from "../db_repository";
import { isValidTransition } from "./validate-table-action";

export async function requestBill(
  companyId: string,
  tableId: string,
): Promise<response<TableSession>> {
  const sessionResponse = await findActiveSession(tableId);
  if (!sessionResponse.success) return sessionResponse;

  const session = sessionResponse.data;

  if (!isValidTransition(session.status, "BILL_REQUESTED")) {
    return {
      success: false,
      message: "Solo se puede pedir la cuenta en una sesion abierta",
    };
  }

  // Validate order has at least one item
  if (session.orderId) {
    const orderResponse = await getOrderBySessionId(session.id);
    if (orderResponse.success && orderResponse.data.orderItems.length === 0) {
      return { success: false, message: "La orden no tiene items. Agrega al menos un producto antes de pedir la cuenta." };
    }
  }

  return updateSessionStatus(session.id, companyId, "BILL_REQUESTED");
}
