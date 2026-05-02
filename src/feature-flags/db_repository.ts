import prisma from "@/lib/prisma";
import type { FeatureKey } from "./registry";
import type { PersistedCompanyFeature } from "./types";

export async function findCompanyFeature(
  companyId: string,
  key: FeatureKey,
): Promise<PersistedCompanyFeature | null> {
  return prisma().companyFeature.findUnique({
    where: {
      companyId_key: {
        companyId,
        key,
      },
    },
  });
}

export async function findCompanyFeatures(
  companyId: string,
): Promise<PersistedCompanyFeature[]> {
  return prisma().companyFeature.findMany({
    where: { companyId },
  });
}

export async function upsertCompanyFeatureEnabled(
  companyId: string,
  key: FeatureKey,
  enabled: boolean,
): Promise<PersistedCompanyFeature> {
  return prisma().companyFeature.upsert({
    where: {
      companyId_key: {
        companyId,
        key,
      },
    },
    create: {
      companyId,
      key,
      enabled,
    },
    update: {
      enabled,
    },
  });
}
