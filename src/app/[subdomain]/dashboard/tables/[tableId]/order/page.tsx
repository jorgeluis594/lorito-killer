import { Suspense } from "react";
import { requirePermission } from "@/authorization/server";
import { findTable } from "@/table/db_repository";
import { TableSessionPanel } from "@/table/components/table-session-panel";
import { TableOrderView } from "@/table/components/table-order-view";

interface PageProps {
  params: Promise<{ subdomain: string; tableId: string }>;
}

async function TableOrderContent({
  tableId,
}: {
  tableId: string;
}) {
  const auth = await requirePermission("tables", "read");
  if (!auth.success) {
    return <p className="p-4 text-destructive">{auth.message}</p>;
  }

  const tableRes = await findTable(tableId, auth.data.companyId);
  if (!tableRes.success) {
    return <p className="p-4 text-destructive">Mesa no encontrada</p>;
  }

  const table = tableRes.data;

  if (!table.activeSession) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">
          Esta mesa no tiene una sesion activa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TableSessionPanel table={table} />
      <TableOrderView table={table} />
    </div>
  );
}

export default async function TableOrderPage(props: PageProps) {
  const params = await props.params;
  return (
    <div className="flex-1 p-4 pt-6 md:p-8">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
            <div className="h-60 animate-pulse rounded bg-muted" />
          </div>
        }
      >
        <TableOrderContent
          tableId={params.tableId}
        />
      </Suspense>
    </div>
  );
}
