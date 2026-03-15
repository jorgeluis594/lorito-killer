import type { response } from "@/lib/types";
import type { TableSession } from "../types";
import { findActiveSession, updateSessionWaiter } from "../db_repository";

export async function transferTable(
  companyId: string,
  tableId: string,
  newWaiterId: string,
): Promise<response<TableSession>> {
  const sessionResponse = await findActiveSession(tableId);
  if (!sessionResponse.success) {
    return { success: false, message: "No hay sesion activa en esta mesa" };
  }

  const session = sessionResponse.data;
  if (session.waiterId === newWaiterId) {
    return { success: false, message: "El mozo seleccionado ya esta asignado a esta mesa" };
  }

  return updateSessionWaiter(session.id, companyId, newWaiterId);
}
