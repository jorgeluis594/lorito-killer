"use server";

import { protectedAction } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { revalidatePath } from "next/cache";
import { broadcast } from "@/lib/realtime/broadcast";
import { enqueueDocumentTaxDispatch } from "@/document/tax-dispatch-outbox";
import { TablePaymentSchema, type TablePaymentInput } from "./payment-schema";
import { getTablePaymentData, payTable } from "./payment-repository";
import { z } from "zod";

const roles = ["ADMIN", "WAITER", "CASHIER"] as const;
export const loadTablePayment = protectedAction(
  { roles: [...roles] },
  async (user, tableId: string, sessionId?: string) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = z
      .object({
        tableId: z.string().uuid(),
        sessionId: z.string().uuid().optional(),
      })
      .safeParse({ tableId, sessionId });
    if (!parsed.success)
      return { success: false, message: "La mesa no es válida." };
    return getTablePaymentData(user.companyId, tableId, sessionId);
  },
);

export const confirmTablePayment = protectedAction(
  { roles: [...roles] },
  async (user, input: TablePaymentInput) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = TablePaymentSchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message ?? "Revisa los datos del pago.",
      };
    const result = await payTable(user, parsed.data);
    if (result.success) {
      revalidatePath("/[subdomain]/dashboard/tables", "layout");
      revalidatePath("/[subdomain]/dashboard", "layout");
      await broadcast(user.companyId, "tables", "table-session-changed", {
        sessionId: input.sessionId,
      }).catch(() => console.warn("Payment notification failed"));
      if (result.data.documentId && input.receipt.documentType !== "ticket")
        await enqueueDocumentTaxDispatch(
          result.data.documentId,
          user.companyId,
        );
    }
    return result;
  },
);
