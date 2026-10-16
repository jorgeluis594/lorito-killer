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
  const feature = await requireFeature(auth.data.companyId, "restaurants");
  if (!feature.success)
    return <p className="p-4 text-destructive">{feature.message}</p>;
  const [clients, kitchens, companyPrinterIds] = await Promise.all([
    getPrintClients(auth.data.companyId),
    listKitchens(auth.data.companyId, false),
    getCompanyPrinterIds(auth.data.companyId),
  ]);
  const printers = clients.flatMap((client) => client.printers);

  return (
    <div>
      <h3 className="text-lg font-medium">Impresión de comandas</h3>
      <p className="text-sm text-muted-foreground">
        Vincula las instalaciones que envían comandas a las impresoras del
        local.
      </p>
      <Separator className="my-4" />
      <div className="flex flex-col gap-8">
        <KitchenSettings
          kitchens={kitchens as Kitchen[]}
          printers={printers}
        />
        <CompanyPrinterSettings
          kind="invoice"
          title="Impresora de comprobantes"
          description="Impresora donde se imprimirán las boletas y facturas."
          currentPrinterId={companyPrinterIds.invoice}
          printers={printers}
        />
        <CompanyPrinterSettings
          kind="cashier"
          title="Impresora de caja"
          description="Impresora asociada a la caja."
          currentPrinterId={companyPrinterIds.cashier}
          printers={printers}
        />
        <PrintClientSettings clients={clients} />
      </div>
    </div>
  );
}
