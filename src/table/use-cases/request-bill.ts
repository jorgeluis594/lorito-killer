import type { response } from "@/lib/types";
import type { TableSession } from "../types";
import { findActiveSession, updateSessionStatus } from "../db_repository";
import { isValidTransition } from "./validate-table-action";

export async function requestBill(
  companyId: string,
  tableId: string,
): Promise<response<TableSession>> {
  const sessionResponse = await findActiveSession(tableId, companyId);
  if (!sessionResponse.success) return sessionResponse;

  const session = sessionResponse.data;

  if (!isValidTransition(session.status, "BILL_REQUESTED")) {
    return {
      success: false,
      message: "Solo se puede pedir la cuenta en una sesion abierta",
    };
  }

  // Validate order has at least one item using currentRound from session
  if (session.currentRound === 0) {
    return { success: false, message: "La orden no tiene items. Agrega al menos un producto antes de pedir la cuenta." };
  }

  return updateSessionStatus(session.id, companyId, "BILL_REQUESTED");
}
