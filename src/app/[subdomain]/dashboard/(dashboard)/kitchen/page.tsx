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

  const title = auth.data.role === "ADMIN" ? "Cocina y Barra" : auth.data.role === "BARTENDER" ? "Barra" : "Cocina";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 md:p-8">
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      {auth.data.role === "ADMIN" ? (
        <div className="grid gap-6 xl:grid-cols-3">
          {([ ["KITCHEN", "Cocina"], ["BAR", "Barra"], [null, "Sin configurar"] ] as const).map(([station, label]) => (
            <section key={label} className="flex min-w-0 flex-col gap-3">
              <h3 className="text-xl font-semibold">{label}</h3>
              <KitchenItems items={result.data.filter((item) => item.preparationStation === station)} />
            </section>
          ))}
        </div>
      ) : <KitchenItems items={result.data} />}
    </div>
  );
}
