import type { FeatureKey } from "./registry";

export type CompanyFeatureState = {
  key: FeatureKey;
  enabled: boolean;
  config: unknown;
  source: "database" | "default";
};

export type PersistedCompanyFeature = {
  id: string;
  companyId: string;
  key: string;
  enabled: boolean;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
};
