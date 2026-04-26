"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";
import type { CompanyFeatureState, FeatureKey } from "./server";

type FeatureFlags = Record<FeatureKey, CompanyFeatureState>;

const FeatureFlagsContext = createContext<FeatureFlags | null>(null);

export function FeatureFlagsProvider({
  features,
  children,
}: {
  features: FeatureFlags;
  children: ReactNode;
}) {
  return (
    <FeatureFlagsContext.Provider value={features}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureEnabled(key: FeatureKey): boolean {
  return useOptionalFeatureEnabled(key);
}

export function useOptionalFeatureEnabled(key?: FeatureKey): boolean {
  const features = useContext(FeatureFlagsContext);
  if (!key) return true;

  if (!features) {
    throw new Error(
      "useOptionalFeatureEnabled must be used within FeatureFlagsProvider",
    );
  }

  return features[key]?.enabled ?? false;
}
