"use server";

import { protectedAction } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { revalidatePath } from "next/cache";
import { FulfillmentOrderIdSchema } from "@/order/rounds/fulfillment-schema";
import {
  completeTakeAway,
  listDeliveryOrders,
  transitionDelivery,
  updateDeliveryDetails,
} from "./db_repository";
import {
  DeliveryListFiltersSchema,
  UpdateDeliveryDetailsSchema,
} from "./schemas";

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

export const editDeliveryDetails = protectedAction(
  { resource: "delivery", action: "update" },
  async (user, input: unknown) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    // Empresa y actor salen de la sesión; precios, totales y estado no se leen
    // de la entrada (el esquema descarta cualquier campo ajeno).
    const parsed = UpdateDeliveryDetailsSchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message: "Los datos del pedido no son válidos.",
      };
    const result = await updateDeliveryDetails(user.companyId, parsed.data);
    if (result.success) revalidatePath("/[subdomain]/dashboard", "layout");
    return result;
  },
);

export const searchDeliveryOrders = protectedAction(
  { resource: "delivery", action: "read" },
  async (user, input: unknown) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = DeliveryListFiltersSchema.safeParse(input ?? {});
    if (!parsed.success)
      return { success: false, message: "Los filtros no son válidos." };
    return listDeliveryOrders(user.companyId, parsed.data);
  },
);
