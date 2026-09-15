import type { UserRole } from "@/authorization/types";
import type { response } from "@/lib/types";
import type { KitchenTicketView } from "../types";

export async function getKitchenTickets(
  input: { companyId: string; userId: string; role: UserRole; orderId: string },
  find: (input: {
    companyId: string;
    orderId: string;
    responsibleUserId?: string;
  }) => Promise<KitchenTicketView[]>,
): Promise<response<KitchenTicketView[]>> {
  if (input.role !== "ADMIN" && input.role !== "WAITER")
    return { success: false, message: "No tienes permiso para ver comandas" };
  return {
    success: true,
    data: await find({
      companyId: input.companyId,
      orderId: input.orderId,
      responsibleUserId: input.role === "WAITER" ? input.userId : undefined,
    }),
  };
}
