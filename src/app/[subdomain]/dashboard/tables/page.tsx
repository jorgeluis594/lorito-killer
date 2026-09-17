import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { hasPermission } from "@/authorization/helpers";
import { requirePermission } from "@/authorization/server";
import { findTables, findZones } from "@/table/db_repository";
import { ArrowLeft, Settings2 } from "lucide-react";
import { TableGrid } from "@/table/components/table-grid";
import { TableGridSkeleton } from "@/table/components/table-grid-skeleton";
import { KitchenAttentionPanel } from "@/kitchen/components/kitchen-attention-panel";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

async function TablesContent({ subdomain }: { subdomain: string }) {
  const auth = await requirePermission("tables", "read");
  if (!auth.success) {
    return <p className="p-4 text-destructive">{auth.message}</p>;
  }

  const [tablesRes, zonesRes] = await Promise.all([
    findTables(auth.data.companyId),
    findZones(auth.data.companyId),
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
  const canConfigure = hasPermission(auth.data.role, "tables", "create");

  const attention = (
    <KitchenAttentionPanel userId={auth.data.id} role={auth.data.role} />
  );

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="w-full">{attention}</div>
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {attention}
      {canConfigure ? (
        <details className="relative self-end">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm hover:bg-accent">
            <Settings2 className="size-4" aria-hidden /> Opciones
          </summary>
          <div className="absolute right-0 z-10 mt-2 min-w-48 rounded-lg border bg-popover p-2">
            <Button variant="ghost" asChild>
              <Link href="/dashboard/tables/configure">Configurar mesas</Link>
            </Button>
          </div>
        </details>
      ) : null}
      <TableGrid
        tables={tables}
        zones={zones}
        canAttend={hasPermission(auth.data.role, "tables", "update")}
      />
    </div>
  );
}

export default async function TablesPage(props: PageProps) {
  const params = await props.params;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-4 px-4 py-5 md:px-8 md:py-8">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard" aria-label="Volver al dashboard">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Mesas</h1>
          <p className="text-sm text-muted-foreground">
            Toca una mesa para atender
          </p>
        </div>
      </header>
      <Suspense fallback={<TableGridSkeleton />}>
        <TablesContent subdomain={params.subdomain} />
      </Suspense>
    </main>
  );
}
