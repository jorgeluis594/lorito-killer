import { requirePermission } from "@/authorization/server";
import { findSellers } from "@/seller/db_repository";
import { SellerSettings } from "@/seller/components/seller-settings";
import { Separator } from "@/shared/components/ui/separator";

export const revalidate = 0;

export default async function SellersSettingsPage() {
  const auth = await requirePermission("company", "update");
  if (!auth.success) {
    return <p className="p-4 text-destructive">{auth.message}</p>;
  }

  const sellersResponse = await findSellers(auth.data.companyId);
  const sellers = sellersResponse.success ? sellersResponse.data : [];

  return (
    <div>
      <h3 className="text-lg font-medium">Sellers</h3>
      <p className="text-sm text-muted-foreground">
        Administra vendedores y sus codigos de 4 digitos.
      </p>
      <Separator className="my-4" />
      {!sellersResponse.success && (
        <p className="mb-4 text-sm text-destructive">
          {sellersResponse.message}
        </p>
      )}
      <SellerSettings sellers={sellers} />
    </div>
  );
}
