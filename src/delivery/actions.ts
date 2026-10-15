"use server";

import { protectedAction } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { revalidatePath } from "next/cache";
import { broadcast } from "@/lib/realtime/broadcast";
import {
  openServiceSession,
  transitionDelivery,
  updateDeliveryDetails,
} from "./db_repository";
import {
  DeliveryDetailsSchema,
  OrderIdSchema,
  UpdateDeliveryDetailsSchema,
} from "./schemas";
import {
  validateDeliveryDetails,
  type DeliveryDetailsErrors,
} from "./use-cases/validate-delivery-details";

// Delivery y para llevar viven en Mesas: mismos permisos que atender una mesa.
const permission = { resource: "tables", action: "update" } as const;

async function notify(companyId: string) {
  revalidatePath("/[subdomain]/dashboard/tables", "layout");
  await broadcast(companyId, "tables", "table-session-changed", {}).catch(
    () => console.warn("Delivery notification failed"),
  );
}

/** Sin datos de entrega abre un pedido para llevar. */
export const openDelivery = protectedAction(
  permission,
  async (
    user,
    input: unknown,
  ): Promise<
    | { success: true; data: { sessionId: string } }
    | { success: false; message: string; errors?: DeliveryDetailsErrors }
  > => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    let delivery = null;
    if (input !== null) {
      const shape = DeliveryDetailsSchema.safeParse(input);
      const details = validateDeliveryDetails(shape.success ? shape.data : {});
      if (!details.success) return details;
      delivery = details.data;
    }
    const result = await openServiceSession({
      companyId: user.companyId,
      userId: user.id,
      delivery,
    });
    if (result.success) await notify(user.companyId);
    return result;
  },
);

const runTransition = (action: "DISPATCH" | "DELIVER") =>
  protectedAction(permission, async (user, input: unknown) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = OrderIdSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, message: "El pedido no es válido." };
    const result = await transitionDelivery(
      user.companyId,
      user.id,
      parsed.data.orderId,
      action,
    );
    if (result.success) await notify(user.companyId);
    return result;
  });

export const dispatchDelivery = runTransition("DISPATCH");
export const deliverDelivery = runTransition("DELIVER");

export const editDeliveryDetails = protectedAction(
  permission,
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
    if (result.success) await notify(user.companyId);
    return result;
  },
);
