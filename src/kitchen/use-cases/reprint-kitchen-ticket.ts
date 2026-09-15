import type { response } from "@/lib/types";
import type { ManualPrintJob } from "../types";
import type { ManualPrintInput } from "./print-kitchen-ticket";

export async function reprintKitchenTicket(
  input: ManualPrintInput,
  create: (
    input: ManualPrintInput & { isReprint: true },
  ) => Promise<response<ManualPrintJob>>,
) {
  if (input.role !== "ADMIN" && input.role !== "WAITER")
    return {
      success: false as const,
      message: "No tienes permiso para reimprimir comandas",
    };
  return create({ ...input, isReprint: true });
}
