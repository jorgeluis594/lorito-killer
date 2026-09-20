import type { UserRole } from "@/authorization/types";
import type { response } from "@/lib/types";
import type { KitchenTicketView } from "../types";

export async function getKitchenTickets(
  input: {
    companyId: string;
    userId: string;
    role: UserRole;
    orderId?: string;
    requiresActionOnly?: boolean;
  },
  find: (input: {
    companyId: string;
    orderId?: string;
    requiresActionOnly?: boolean;
    responsibleUserId?: string;
  }) => Promise<KitchenTicketView[]>,
): Promise<response<KitchenTicketView[]>> {
  if (input.role !== "ADMIN" && input.role !== "WAITER")
    return { success: false, message: "No tienes permiso para ver comandas" };
  return {
    success: true,
    data: await find({
      companyId: input.companyId,
      ...(input.orderId ? { orderId: input.orderId } : {}),
      ...(input.requiresActionOnly ? { requiresActionOnly: true } : {}),
      responsibleUserId: input.role === "WAITER" ? input.userId : undefined,
    }),
  };
}
