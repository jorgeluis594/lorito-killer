import { Suspense } from "react";
import { requirePermission } from "@/authorization/server";
import { findTable } from "@/table/db_repository";
import { hasPermission } from "@/authorization/helpers";
import Link from "next/link";
import { TableOrderView } from "@/table/components/table-order-view";

interface PageProps {
  params: Promise<{ subdomain: string; tableId: string }>;
}

async function TableOrderContent({ tableId }: { tableId: string }) {
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
        <Link href="/dashboard/tables" className="mt-4 inline-block underline">
          Volver a mesas
        </Link>
      </div>
    );
  }

  return (
    <TableOrderView
      key={table.activeSession.id}
      table={table}
      canEdit={hasPermission(auth.data.role, "tables", "update")}
    />
  );
}

export default async function TableOrderPage(props: PageProps) {
  const params = await props.params;
  return (
    <div className="min-h-dvh">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
            <div className="h-60 animate-pulse rounded bg-muted" />
          </div>
        }
      >
        <TableOrderContent tableId={params.tableId} />
      </Suspense>
    </div>
  );
}
