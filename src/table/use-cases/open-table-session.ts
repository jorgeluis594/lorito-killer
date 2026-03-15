import type { response } from "@/lib/types";
import type { TableSession } from "../types";
import { createSession, createDineInOrder, findTable } from "../db_repository";

export async function openTableSession(
  companyId: string,
  tableId: string,
  waiterId: string,
  guestCount?: number,
  notes?: string,
): Promise<response<TableSession>> {
  // 1. Verify table exists and belongs to tenant
  const tableResponse = await findTable(tableId, companyId);
  if (!tableResponse.success) return tableResponse;

  const table = tableResponse.data;
  if (table.activeSession) {
    return { success: false, message: "La mesa ya tiene una sesion activa" };
  }

  // 2. Create session (unique constraint prevents race conditions)
  const sessionResponse = await createSession({
    companyId,
    tableId,
    waiterId,
    guestCount,
    notes,
  });
  if (!sessionResponse.success) return sessionResponse;

  // 3. Create associated DINE_IN order
  const orderResponse = await createDineInOrder(sessionResponse.data.id, companyId);
  if (!orderResponse.success) {
    return { success: false, message: "Error creando la orden: " + orderResponse.message };
  }

  return {
    success: true,
    data: { ...sessionResponse.data, orderId: orderResponse.data },
  };
}
