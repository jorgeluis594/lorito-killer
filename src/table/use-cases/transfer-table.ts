import type { response } from "@/lib/types";
import type { TableSession } from "../types";
import { findActiveSession, updateSessionWaiter, findUserByIdAndCompany } from "../db_repository";

export async function transferTable(
  companyId: string,
  tableId: string,
  newWaiterId: string,
): Promise<response<TableSession>> {
  const sessionResponse = await findActiveSession(tableId, companyId);
  if (!sessionResponse.success) {
    return { success: false, message: "No hay sesion activa en esta mesa" };
  }

  const session = sessionResponse.data;
  if (session.waiterId === newWaiterId) {
    return { success: false, message: "El mozo seleccionado ya esta asignado a esta mesa" };
  }

  // Validate new waiter belongs to the same company
  const waiterResponse = await findUserByIdAndCompany(newWaiterId, companyId);
  if (!waiterResponse.success) {
    return { success: false, message: "El mozo seleccionado no pertenece a esta empresa" };
  }

  return updateSessionWaiter(session.id, companyId, newWaiterId);
}
