import { requireRole } from "@/authorization/server";
import { getPrintClients } from "@/printing/clients/db_repository";
import { PrintClientSettings } from "@/printing/clients/components/print-client-settings";
import { Separator } from "@/shared/components/ui/separator";

export const revalidate = 0;

export default async function PrintingSettingsPage() {
  const auth = await requireRole("ADMIN");
  if (!auth.success)
    return <p className="p-4 text-destructive">{auth.message}</p>;
  const clients = await getPrintClients(auth.data.companyId);

  return (
    <div>
      <h3 className="text-lg font-medium">Clientes de impresión</h3>
      <p className="text-sm text-muted-foreground">
        Vincula las instalaciones que envían comandas a las impresoras del
        local.
      </p>
      <Separator className="my-4" />
      <PrintClientSettings clients={clients} />
    </div>
  );
}
