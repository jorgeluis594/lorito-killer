"use server";

import { protectedAction } from "@/authorization/server";
import type { response } from "@/lib/types";
import { broadcast } from "@/lib/realtime/broadcast";
import { revalidatePath } from "next/cache";
import { ReadyOrderItemSchema, TakeOrderItemSchema } from "@/table/schemas";
import {
  createKitchenConfiguration,
  listKitchens,
  markPreparingOrderItemReady,
  takePendingOrderItem,
  servePaidKitchenItem,
  updateKitchenConfiguration,
} from "./db_repository";
import { KitchenInputSchema } from "./schema";
import type { Kitchen, KitchenOption } from "./types";
import {
  createKitchen,
  getKitchens,
  updateKitchen,
} from "./use-cases/configure-kitchens";

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

export const takeOrderItemAction = protectedAction(
  { resource: "kitchen", action: "update" },
  async (user, orderItemId: string): Promise<response<void>> => {
    const parsed = TakeOrderItemSchema.safeParse({ orderItemId });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await takePendingOrderItem({
      orderItemId: parsed.data.orderItemId,
      companyId: user.companyId,
      userId: user.id,
      role: user.role,
    });
    if (result.success) {
      revalidatePath("/dashboard/kitchen");
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "order-item-taken", {
        orderItemId: parsed.data.orderItemId,
      });
    }
    return result;
  },
);

export const markOrderItemReadyAction = protectedAction(
  { resource: "kitchen", action: "update" },
  async (user, orderItemId: string): Promise<response<void>> => {
    const parsed = ReadyOrderItemSchema.safeParse({ orderItemId });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await markPreparingOrderItemReady({
      orderItemId: parsed.data.orderItemId,
      companyId: user.companyId,
      userId: user.id,
      role: user.role,
    });
    if (result.success) {
      revalidatePath("/dashboard/kitchen");
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "kitchen-item-ready", {
        orderItemId: parsed.data.orderItemId,
      });
    }
    return result;
  },
);

export const servePaidKitchenItemAction = protectedAction(
  { resource: "kitchen", action: "update" },
  async (user, orderItemId: string): Promise<response<void>> => {
    const parsed = ReadyOrderItemSchema.safeParse({ orderItemId });
    if (!parsed.success)
      return { success: false, message: "Producto no válido" };
    const result = await servePaidKitchenItem({
      ...parsed.data,
      companyId: user.companyId,
      userId: user.id,
      role: user.role,
    });
    if (result.success) {
      revalidatePath("/dashboard/kitchen");
      await broadcast(user.companyId, "tables", "kitchen-item-ready", {
        orderItemId,
      }).catch(() => console.warn("Kitchen notification failed"));
    }
    return result;
  },
);
