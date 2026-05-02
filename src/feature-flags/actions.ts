"use server";

import { protectedAction } from "@/authorization/server";
import type { response } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { isFeatureKey, type FeatureKey } from "./registry";
import { upsertCompanyFeatureEnabled } from "./db_repository";
import type { CompanyFeatureState } from "./types";

export const updateCompanyFeatureEnabled = protectedAction(
  { resource: "company", action: "update" },
  async (
    user,
    key: FeatureKey,
    enabled: boolean,
  ): Promise<response<CompanyFeatureState>> => {
    if (!isFeatureKey(key)) {
      return {
        success: false,
        message: "Funcionalidad no valida",
      };
    }

    const feature = await upsertCompanyFeatureEnabled(
      user.companyId,
      key,
      enabled,
    );

    revalidatePath("/dashboard/settings/features");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        key,
        enabled: feature.enabled,
        config: feature.config,
        source: "database",
      },
    };
  },
);
