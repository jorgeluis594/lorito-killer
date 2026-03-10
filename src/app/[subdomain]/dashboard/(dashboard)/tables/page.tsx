import { Suspense } from "react";
import { requirePermission } from "@/authorization/server";
import { findTables, findZones, getWaiters } from "@/table/db_repository";
import { TableGrid } from "@/table/components/table-grid";
import { TableGridSkeleton } from "@/table/components/table-grid-skeleton";

interface PageProps {
  params: { subdomain: string };
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

  const tables = tablesRes.success ? tablesRes.data : [];
  const zones = zonesRes.success ? zonesRes.data : [];
  const waiters = waitersRes.success ? waitersRes.data : [];

  return (
    <TableGrid
      tables={tables}
      zones={zones}
      waiters={waiters}
      subdomain={subdomain}
    />
  );
}

export default function TablesPage({ params }: PageProps) {
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
