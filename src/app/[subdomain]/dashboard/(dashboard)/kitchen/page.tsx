import { requirePermission } from "@/authorization/server";
import { findKitchenItems } from "@/kitchen/db_repository";
import { KitchenItems } from "@/kitchen/components/kitchen-items";

export default async function KitchenPage() {
  const auth = await requirePermission("kitchen", "read");
  if (!auth.success)
    return <p className="p-4 text-destructive">{auth.message}</p>;

  const result = await findKitchenItems(auth.data.companyId, auth.data.role);
  if (!result.success)
    return <p className="p-4 text-destructive">{result.message}</p>;

  const title =
    auth.data.role === "ADMIN"
      ? "Cocina y Barra"
      : auth.data.role === "BARTENDER"
        ? "Barra"
        : "Cocina";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 md:p-8">
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      <KitchenItems
        items={result.data}
        groupByStation={auth.data.role === "ADMIN"}
      />
    </div>
  );
}
