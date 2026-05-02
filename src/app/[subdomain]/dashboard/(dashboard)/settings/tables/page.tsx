import { Suspense } from "react";
import { requirePermission } from "@/authorization/server";
import { findTables, findZones } from "@/table/db_repository";
import { ZoneConfigForm } from "@/table/components/zone-config-form";
import { TableConfigForm } from "@/table/components/table-config-form";
import { Separator } from "@/shared/components/ui/separator";

async function TablesSettingsContent() {
  const auth = await requirePermission("tables", "create");
  if (!auth.success) {
    return <p className="p-4 text-destructive">{auth.message}</p>;
  }

  const [tablesRes, zonesRes] = await Promise.all([
    findTables(auth.data.companyId),
    findZones(auth.data.companyId),
  ]);

  const tables = tablesRes.success ? tablesRes.data : [];
  const zones = zonesRes.success ? zonesRes.data : [];

  return (
    <div className="space-y-6">
      <ZoneConfigForm zones={zones} />
      <Separator />
      <TableConfigForm tables={tables} zones={zones} />
    </div>
  );
}

export default function TablesSettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Configuracion de Mesas
        </h2>
        <p className="text-muted-foreground">
          Administra las zonas y mesas de tu restaurante.
        </p>
      </div>
      <Separator />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <div className="h-40 animate-pulse rounded bg-muted" />
          </div>
        }
      >
        <TablesSettingsContent />
      </Suspense>
    </div>
  );
}
