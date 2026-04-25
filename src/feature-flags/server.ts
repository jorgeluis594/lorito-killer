import type { response } from "@/lib/types";
import {
  FEATURES,
  isFeatureKey,
  type FeatureDefinition,
  type FeatureKey,
} from "./registry";
import {
  findCompanyFeature,
  findCompanyFeatures,
} from "./db_repository";
import type { CompanyFeatureState } from "./types";

export { isFeatureKey };
export type { FeatureDefinition, FeatureKey, CompanyFeatureState };

export function getFeatureDefinition(key: FeatureKey): FeatureDefinition {
  return FEATURES[key];
}

export async function getCompanyFeature(
  companyId: string,
  key: FeatureKey,
): Promise<CompanyFeatureState> {
  const feature = await findCompanyFeature(companyId, key);

  if (feature) {
    return {
      key,
      enabled: feature.enabled,
      config: feature.config,
      source: "database",
    };
  }

  return {
    key,
    enabled: FEATURES[key].defaultEnabled,
    config: null,
    source: "default",
  };
}

export async function getCompanyFeatures(
  companyId: string,
): Promise<Record<FeatureKey, CompanyFeatureState>> {
  const storedFeatures = await findCompanyFeatures(companyId);
  const storedByKey = new Map(
    storedFeatures
      .filter((feature) => isFeatureKey(feature.key))
      .map((feature) => [feature.key, feature]),
  );

  return Object.keys(FEATURES).reduce(
    (features, key) => {
      const featureKey = key as FeatureKey;
      const storedFeature = storedByKey.get(featureKey);

      features[featureKey] = storedFeature
        ? {
            key: featureKey,
            enabled: storedFeature.enabled,
            config: storedFeature.config,
            source: "database",
          }
        : {
            key: featureKey,
            enabled: FEATURES[featureKey].defaultEnabled,
            config: null,
            source: "default",
          };

      return features;
    },
    {} as Record<FeatureKey, CompanyFeatureState>,
  );
}

export async function isFeatureEnabled(
  companyId: string,
  key: FeatureKey,
): Promise<boolean> {
  const feature = await getCompanyFeature(companyId, key);
  return feature.enabled;
}

export async function requireFeature(
  companyId: string,
  key: FeatureKey,
): Promise<response<CompanyFeatureState>> {
  const feature = await getCompanyFeature(companyId, key);

  if (!feature.enabled) {
    return {
      success: false,
      message: "Esta funcionalidad no esta activa para tu empresa",
      type: "AuthorizationError",
    };
  }

  return { success: true, data: feature };
}
