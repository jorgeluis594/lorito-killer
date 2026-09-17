"use server";

import { protectedAction } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { revalidatePath } from "next/cache";
import { FulfillmentOrderIdSchema } from "@/order/rounds/fulfillment-schema";
import {
  cancelFulfillmentOrder,
  completeTakeAway,
  transitionDelivery,
} from "./db_repository";

const runTransition = (action: "DISPATCH" | "DELIVER") =>
  protectedAction(
    { resource: "delivery", action: "update" },
    async (user, input: unknown) => {
      const feature = await requireFeature(user.companyId, "restaurants");
      if (!feature.success) return feature;
      const parsed = FulfillmentOrderIdSchema.safeParse(input);
      if (!parsed.success)
        return { success: false, message: "El pedido no es válido." };
      const result = await transitionDelivery(
        user.companyId,
        user.id,
        parsed.data.orderId,
        action,
      );
      if (result.success)
        revalidatePath("/[subdomain]/dashboard/orders", "layout");
      return result;
    },
  );

export const dispatchDelivery = runTransition("DISPATCH");
export const deliverDelivery = runTransition("DELIVER");

export const cancelFulfillment = protectedAction(
  { resource: "delivery", action: "update" },
  async (user, input: unknown) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = FulfillmentOrderIdSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, message: "El pedido no es válido." };
    const result = await cancelFulfillmentOrder(
      user.companyId,
      parsed.data.orderId,
    );
    if (result.success)
      revalidatePath("/[subdomain]/dashboard/orders", "layout");
    return result;
  },
);

export const deliverTakeAway = protectedAction(
  { resource: "delivery", action: "update" },
  async (user, input: unknown) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = FulfillmentOrderIdSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, message: "El pedido no es válido." };
    const result = await completeTakeAway(user.companyId, parsed.data.orderId);
    if (result.success)
      revalidatePath("/[subdomain]/dashboard/orders", "layout");
    return result;
  },
);
