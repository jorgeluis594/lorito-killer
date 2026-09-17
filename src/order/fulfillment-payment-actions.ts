"use server";

import { protectedAction } from "@/authorization/server";
import { enqueueDocumentTaxDispatch } from "@/document/tax-dispatch-outbox";
import { requireFeature } from "@/feature-flags/server";
import { revalidatePath } from "next/cache";
import { FulfillmentPaymentSchema } from "./fulfillment-payment-schema";
import { payFulfillmentOrder } from "./fulfillment-payment-repository";

export const confirmFulfillmentPayment = protectedAction(
  { roles: ["ADMIN", "CASHIER"] },
  async (user, input: unknown) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = FulfillmentPaymentSchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Revisa el pago.",
      };
    const result = await payFulfillmentOrder(user, parsed.data);
    if (result.success) {
      revalidatePath("/[subdomain]/dashboard/orders", "layout");
      if (parsed.data.receipt.documentType !== "ticket")
        await enqueueDocumentTaxDispatch(
          result.data.documentId,
          user.companyId,
        );
    }
    return result;
  },
);
