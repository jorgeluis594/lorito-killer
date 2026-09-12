import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { hasPermission } from "@/authorization/helpers";
import { requirePermission } from "@/authorization/server";
import { findTables, findZones, getWaiters } from "@/table/db_repository";
import { TableGrid } from "@/table/components/table-grid";
import { TableGridSkeleton } from "@/table/components/table-grid-skeleton";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

async function TablesContent({ subdomain }: { subdomain: string }) {
  const auth = await requirePermission("tables", "read");
  if (!auth.success) {
    return <p className="p-4 text-destructive">{auth.message}</p>;
  }

  const [tablesRes, zonesRes, waitersRes] = await Promise.all([
    findTables(auth.data.companyId),
    findZones(auth.data.companyId),
    getWaiters(auth.data.companyId),
  ]);

  if (!tablesRes.success || !zonesRes.success) {
    return (
      <p role="alert">
        No se pudieron cargar las mesas. Actualiza la página para volver a
        intentarlo.
      </p>
    );
  }
  const tables = tablesRes.data;
  const zones = zonesRes.data;
  const waiters = waitersRes.success ? waitersRes.data : [];
  const canConfigure = hasPermission(auth.data.role, "tables", "create");

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <h3 className="text-2xl font-bold">Prepara tus mesas para empezar</h3>
        <p className="text-muted-foreground">
          {canConfigure
            ? "Indica cuántas mesas tienes. Nosotros las numeramos."
            : "Pide al administrador que configure las mesas del restaurante."}
        </p>
        {canConfigure ? (
          <Button asChild>
            <Link href="/dashboard/tables/configure">Crear mis mesas</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canConfigure ? (
        <Button variant="outline" asChild className="self-end">
          <Link href="/dashboard/tables/configure">Configurar mesas</Link>
        </Button>
      ) : null}
      <TableGrid
        tables={tables}
        zones={zones}
        waiters={waiters}
        subdomain={subdomain}
      />
    </div>
  );
}

export default async function TablesPage(props: PageProps) {
  const params = await props.params;
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Mesas</h2>
      </div>
      <Suspense fallback={<TableGridSkeleton />}>
        <TablesContent subdomain={params.subdomain} />
      </Suspense>
    </div>
  );
}
