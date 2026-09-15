import type { UserRole } from "@/authorization/types";
import type { response } from "@/lib/types";
import type { ManualPrintJob } from "../types";

export type ManualPrintInput = {
  companyId: string;
  userId: string;
  role: UserRole;
  kitchenTicketId: string;
  jobId: string;
};

export async function printKitchenTicket(
  input: ManualPrintInput,
  create: (
    input: ManualPrintInput & { isReprint: false },
  ) => Promise<response<ManualPrintJob>>,
) {
  if (input.role !== "ADMIN" && input.role !== "WAITER")
    return {
      success: false as const,
      message: "No tienes permiso para imprimir comandas",
    };
  return create({ ...input, isReprint: false });
}
