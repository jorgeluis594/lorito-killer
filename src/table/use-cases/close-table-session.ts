import type { response } from "@/lib/types";
import type { TableSession } from "../types";
import { findActiveSession, updateSessionStatus } from "../db_repository";
import { isValidTransition } from "./validate-table-action";

export async function closeTableSession(
  companyId: string,
  tableId: string,
  cancelled: boolean = false,
): Promise<response<TableSession>> {
  const sessionResponse = await findActiveSession(tableId);
  if (!sessionResponse.success) return sessionResponse;

  const session = sessionResponse.data;
  const targetStatus = cancelled ? "CANCELLED" : "CLOSED";

  if (!isValidTransition(session.status, targetStatus)) {
    return {
      success: false,
      message: `No se puede ${cancelled ? "cancelar" : "cerrar"} una sesion en estado ${session.status}`,
    };
  }

  return updateSessionStatus(session.id, companyId, targetStatus);
}
