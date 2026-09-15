"use server";

import { protectedAction } from "@/authorization/server";
import type { response } from "@/lib/types";
import { revalidatePath } from "next/cache";
import {
  createKitchenConfiguration,
  listKitchens,
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
