"use server";

import { protectedAction, type AuthorizedUser } from "@/authorization/server";
import type { response } from "@/lib/types";
import { revalidatePath } from "next/cache";
import {
  createManualKitchenTicketPrintJob,
  createKitchenConfiguration,
  findKitchenTickets,
  listKitchens,
  updateKitchenConfiguration,
} from "./db_repository";
import {
  KitchenInputSchema,
  KitchenTicketOrderSchema,
  ManualKitchenTicketPrintSchema,
} from "./schema";
import type {
  Kitchen,
  KitchenOption,
  KitchenTicketView,
  ManualPrintJob,
} from "./types";
import {
  createKitchen,
  getKitchens,
  updateKitchen,
} from "./use-cases/configure-kitchens";
import { getKitchenTickets } from "./use-cases/get-kitchen-tickets";
import { printKitchenTicket } from "./use-cases/print-kitchen-ticket";
import { reprintKitchenTicket } from "./use-cases/reprint-kitchen-ticket";
import { createKitchenTicketContent } from "@/printing/create-kitchen-ticket-content";
import { processPrintJobs } from "./process-print-jobs";

const kitchenDependencies = {
  list: listKitchens,
  create: createKitchenConfiguration,
  update: updateKitchenConfiguration,
};

export const getKitchenOptions = protectedAction(
  { roles: ["ADMIN"] },
  async (user): Promise<response<KitchenOption[]>> => ({
    success: true,
    data: (await getKitchens(
      kitchenDependencies,
      user.companyId,
      "PRODUCT_SELECTOR",
    )) as KitchenOption[],
  }),
);

export const createKitchenAction = protectedAction(
  { roles: ["ADMIN"] },
  async (user, input: unknown): Promise<response<Kitchen>> => {
    const parsed = KitchenInputSchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos inválidos",
      };
    const result = await createKitchen(
      kitchenDependencies,
      user.companyId,
      parsed.data,
    );
    if (result.success) revalidatePath("/dashboard/settings/printing");
    return result;
  },
);

export const updateKitchenAction = protectedAction(
  { roles: ["ADMIN"] },
  async (user, input: unknown): Promise<response<Kitchen>> => {
    const parsed = KitchenInputSchema.safeParse(input);
    if (!parsed.success || !parsed.data.id)
      return {
        success: false,
        message: parsed.success
          ? "Kitchen requerida"
          : parsed.error.errors[0]?.message ?? "Datos inválidos",
      };
    const result = await updateKitchen(
      kitchenDependencies,
      user.companyId,
      parsed.data.id,
      parsed.data,
    );
    if (result.success) revalidatePath("/dashboard/settings/printing");
    return result;
  },
);

export const getKitchenTicketsAction = protectedAction(
  { roles: ["ADMIN", "WAITER"] },
  async (user, orderId: string): Promise<response<KitchenTicketView[]>> => {
    const parsed = KitchenTicketOrderSchema.safeParse(orderId);
    if (!parsed.success) return { success: false, message: "Pedido inválido" };
    return getKitchenTickets(
      { companyId: user.companyId, userId: user.id, role: user.role, orderId },
      findKitchenTickets,
    );
  },
);

async function requestManualPrint(
  user: AuthorizedUser,
  input: unknown,
  isReprint: boolean,
): Promise<response<ManualPrintJob>> {
  const parsed = ManualKitchenTicketPrintSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: "Solicitud de impresión inválida" };
  const params = {
    companyId: user.companyId,
    userId: user.id,
    role: user.role,
    ...parsed.data,
  };
  const result = isReprint
    ? await reprintKitchenTicket(params, (request) =>
        createManualKitchenTicketPrintJob(request, createKitchenTicketContent),
      )
    : await printKitchenTicket(params, (request) =>
        createManualKitchenTicketPrintJob(request, createKitchenTicketContent),
      );
  if (result.success) {
    revalidatePath("/[subdomain]/dashboard/tables", "layout");
    void processPrintJobs().catch(() =>
      console.warn("Manual print job notification failed"),
    );
  }
  return result;
}

export const printKitchenTicketAction = protectedAction(
  { roles: ["ADMIN", "WAITER"] },
  (user, input: unknown) => requestManualPrint(user, input, false),
);

export const reprintKitchenTicketAction = protectedAction(
  { roles: ["ADMIN", "WAITER"] },
  (user, input: unknown) => requestManualPrint(user, input, true),
);
