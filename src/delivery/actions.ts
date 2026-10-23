"use server";

import { protectedAction } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { revalidatePath } from "next/cache";
import { broadcast } from "@/lib/realtime/broadcast";
import { log } from "@/lib/log";
import {
  openServiceSession,
  transitionDelivery,
  updateDeliveryDetails,
  updateTakeAwayCustomerName,
} from "./db_repository";
import {
  OpenTakeAwaySchema,
  OrderIdSchema,
  SaveTakeAwayCustomerNameSchema,
  UpdateDeliveryDetailsSchema,
} from "./schemas";
import type { SaveCustomerNameResult } from "./types";
import { normalizeCustomerName } from "./use-cases/normalize-customer-name";
import {
  validateDeliveryDetails,
  type DeliveryDetailsErrors,
  type DeliveryDetailsInput,
} from "./use-cases/validate-delivery-details";

// Delivery y para llevar viven en Mesas: mismos permisos que atender una mesa.
const permission = { resource: "tables", action: "update" } as const;

async function notify(companyId: string) {
  revalidatePath("/[subdomain]/dashboard/tables", "layout");
  await broadcast(companyId, "tables", "table-session-changed", {}).catch(
    (error) => log.warn("delivery_notification_failed", { companyId, error }),
  );
}

/** Abre un delivery. El pedido para llevar se abre con `openTakeAway`. */
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
    // El validador revisa el tipo de cada campo, así que recibe la entrada tal cual.
    const details = validateDeliveryDetails(
      input !== null && typeof input === "object"
        ? (input as DeliveryDetailsInput)
        : {},
    );
    if (!details.success) return details;
    const result = await openServiceSession({
      companyId: user.companyId,
      userId: user.id,
      delivery: details.data,
    });
    if (!result.success) return result;
    await notify(user.companyId);
    return { success: true, data: { sessionId: result.data.sessionId } };
  },
);

/** Abre un Para llevar. `sessionId` es la clave del intento: repetirla no crea otro pedido. */
export const openTakeAway = protectedAction(
  permission,
  async (
    user,
    input: unknown,
  ): Promise<
    | { success: true; data: { sessionId: string } }
    | { success: false; message: string; errors?: { customerName?: string } }
  > => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = OpenTakeAwaySchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message: "Los datos del pedido no son válidos.",
      };
    const name = normalizeCustomerName(parsed.data.customerName);
    if (!name.success)
      return {
        success: false,
        message: name.message,
        errors: { customerName: name.message },
      };
    const result = await openServiceSession({
      companyId: user.companyId,
      userId: user.id,
      sessionId: parsed.data.sessionId,
      customerName: name.data,
      delivery: null,
    });
    if (!result.success) return result;
    log.info("take_away_opened", {
      companyId: user.companyId,
      userId: user.id,
      sessionId: result.data.sessionId,
      hasCustomerName: name.data !== null,
      replayed: result.data.replayed,
      closed: result.data.closed,
    });
    if (!result.data.replayed) await notify(user.companyId);
    return { success: true, data: { sessionId: result.data.sessionId } };
  },
);

export const saveTakeAwayCustomerName = protectedAction(
  permission,
  async (user, input: unknown): Promise<SaveCustomerNameResult> => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = SaveTakeAwayCustomerNameSchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message: "Los datos del pedido no son válidos.",
      };
    const next = normalizeCustomerName(parsed.data.customerName);
    if (!next.success)
      return {
        success: false,
        message: next.message,
        errors: { customerName: next.message },
      };
    const expected = normalizeCustomerName(parsed.data.expectedName);
    if (!expected.success)
      return {
        success: false,
        message: "Los datos del pedido no son válidos.",
      };
    const result = await updateTakeAwayCustomerName(user.companyId, {
      sessionId: parsed.data.sessionId,
      customerName: next.data,
      expectedName: expected.data,
    });
    if (result.success) {
      log.info("take_away_customer_name_saved", {
        companyId: user.companyId,
        userId: user.id,
        sessionId: parsed.data.sessionId,
        outcome: result.data.changed ? "saved" : "unchanged",
      });
      if (result.data.changed) await notify(user.companyId);
    } else if (
      result.type === "CustomerNameConflict" &&
      "currentName" in result
    ) {
      log.warn("take_away_customer_name_conflict", {
        companyId: user.companyId,
        userId: user.id,
        sessionId: parsed.data.sessionId,
        kind: result.currentName === null ? "removed" : "changed",
      });
    }
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
