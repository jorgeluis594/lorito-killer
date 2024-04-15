import type { CashShiftWithOutOrders } from "@/cash-shift/types";
import { response } from "@/lib/types";

export async function getManyCashShifts(): Promise<
  response<CashShiftWithOutOrders[]>
> {
  const response = await fetch("/api/cash_shifts");
  if (!response.ok) {
    return { success: false, message: "Error cargando caja chicas" };
  }

  return await response.json();
}
