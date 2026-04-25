export const FEATURES = {
  restaurants: {
    label: "Restaurantes",
    defaultEnabled: false,
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;

export type FeatureDefinition = (typeof FEATURES)[FeatureKey];

export function isFeatureKey(value: string): value is FeatureKey {
  return Object.prototype.hasOwnProperty.call(FEATURES, value);
}
