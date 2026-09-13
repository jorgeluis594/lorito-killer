import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requirePermission } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { hasPermission } from "@/authorization/helpers";
import { findTableConfiguration } from "@/table/db_repository";
import { TableConfigForm } from "@/table/components/table-config-form";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";

export default async function TableConfigurationPage() {
  const auth = await requirePermission("tables", "create");
  if (!auth.success)
    return (
      <p role="alert" className="p-8 text-destructive">
        {auth.message}
      </p>
    );
  const feature = await requireFeature(auth.data.companyId, "restaurants");
  if (!feature.success)
    return (
      <p role="alert" className="p-8">
        {feature.message}
      </p>
    );
  const result = await findTableConfiguration(auth.data.companyId);
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-8 p-4 pt-6 md:p-8">
      <PageHeader.Navigation aria-label="Ruta de navegación">
        <Link
          href="/dashboard/tables"
          className="hover:text-foreground hover:underline"
        >
          Mesas
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span aria-current="page" className="text-foreground">
          Configurar mesas
        </span>
      </PageHeader.Navigation>
      {result.success ? (
        <TableConfigForm
          configuration={result.data}
          canDelete={hasPermission(auth.data.role, "tables", "delete")}
        />
      ) : (
        <div className="flex flex-col items-start gap-4">
          <PageHeader.Title>Configurar mesas</PageHeader.Title>
          <p role="alert">{result.message}</p>
          <form action="/dashboard/tables/configure" method="get">
            <Button type="submit" variant="outline">
              Volver a intentar
            </Button>
          </form>
        </div>
      )}
    </main>
  );
}
