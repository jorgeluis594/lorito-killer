import { requireRole } from "@/authorization/server";
import {
  getCompanyPrinterIds,
  getPrintClients,
} from "@/printing/clients/db_repository";
import { PrintClientSettings } from "@/printing/clients/components/print-client-settings";
import { CompanyPrinterSettings } from "@/printing/clients/components/company-printer-settings";
import { Separator } from "@/shared/components/ui/separator";
import { listKitchens } from "@/kitchen/db_repository";
import { KitchenSettings } from "@/kitchen/components/kitchen-settings";
import type { Kitchen } from "@/kitchen/types";
import { requireFeature } from "@/feature-flags/server";

export const revalidate = 0;

export default async function PrintingSettingsPage() {
  const auth = await requireRole("ADMIN");
  if (!auth.success)
    return <p className="p-4 text-destructive">{auth.message}</p>;
  const [clients, restaurants, companyPrinterIds] = await Promise.all([
    getPrintClients(auth.data.companyId),
    requireFeature(auth.data.companyId, "restaurants"),
    getCompanyPrinterIds(auth.data.companyId),
  ]);
  const kitchens = restaurants.success
    ? await listKitchens(auth.data.companyId, false)
    : null;
  const printers = clients.flatMap((client) => client.printers);

  return (
    <div>
      <h3 className="text-lg font-medium">Impresión</h3>
      <p className="text-sm text-muted-foreground">
        Vincula las instalaciones que envían comprobantes y comandas a las
        impresoras del local.
      </p>
      <Separator className="my-4" />
      <div className="flex flex-col gap-8">
        {kitchens && (
          <KitchenSettings
            kitchens={kitchens as Kitchen[]}
            printers={printers}
          />
        )}
        <CompanyPrinterSettings
          currentPrinterId={companyPrinterIds.cashier}
          printers={printers}
        />
        <PrintClientSettings clients={clients} />
      </div>
    </div>
  );
}
