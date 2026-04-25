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
