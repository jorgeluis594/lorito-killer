"use server";

import { protectedAction } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { revalidatePath } from "next/cache";
import { broadcast } from "@/lib/realtime/broadcast";
import { enqueueDocumentTaxDispatch } from "@/document/tax-dispatch-outbox";
import { log } from "@/lib/log";
import { TablePaymentSchema, type TablePaymentInput } from "./payment-schema";
import { getTablePaymentData, payTable } from "./payment-repository";
import { printPreBill } from "./use-cases/print-pre-bill";
import { z } from "zod";

const roles = ["ADMIN", "WAITER", "CASHIER"] as const;
export const loadTablePayment = protectedAction(
  { roles: [...roles] },
  async (user, where: { sessionId: string } | { tableId: string }) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = z
      .union([
        z.object({ sessionId: z.string().uuid() }),
        z.object({ tableId: z.string().uuid() }),
      ])
      .safeParse(where);
    if (!parsed.success)
      return { success: false, message: "La cuenta no es válida." };
    return getTablePaymentData(user.companyId, parsed.data);
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
      // Enviar a caja imprime la precuenta si hay impresora; nunca hace fallar el envío.
      if (result.data.state === "register")
        await printPreBill(user.companyId, user.id, input.sessionId).catch(
          (error) =>
            log.warn("pre_bill_print_failed", {
              sessionId: input.sessionId,
              error,
            }),
        );
      if (
        result.data.documentId &&
        result.data.documentType &&
        result.data.documentType !== "ticket"
      )
        await enqueueDocumentTaxDispatch(
          result.data.documentId,
          user.companyId,
        );
    }
    return result;
  },
);
