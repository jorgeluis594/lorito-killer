import { requirePermission } from "@/authorization/server";
import { FEATURES, getCompanyFeatures, type FeatureKey } from "@/feature-flags";
import { CompanyFeatureSettings } from "@/feature-flags/components/company-feature-settings";
import { Separator } from "@/shared/components/ui/separator";

export const revalidate = 0;

export default async function CompanyFeaturesSettingsPage() {
  const auth = await requirePermission("company", "update");
  if (!auth.success) {
    return <p className="p-4 text-destructive">{auth.message}</p>;
  }

  const companyFeatures = await getCompanyFeatures(auth.data.companyId);
  const features = Object.entries(FEATURES).map(([key, definition]) => {
    const featureKey = key as FeatureKey;

    return {
      key: featureKey,
      definition,
      state: companyFeatures[featureKey],
    };
  });

  return (
    <div>
      <h3 className="text-lg font-medium">Features</h3>
      <p className="text-sm text-muted-foreground">
        Activa o desactiva funcionalidades para tu empresa.
      </p>
      <Separator className="my-4" />
      <CompanyFeatureSettings features={features} />
    </div>
  );
}
