import { getMany, getTotal } from "@/document/db_repository";
import type { SearchParams } from "@/document/types";
import { getSession } from "@/lib/auth";
import { objectToQueryString } from "@/lib/utils";
import DownloadXLSXButton from "@/sale_report/components/download_xlsx_button";
import Filters from "@/sale_report/components/filter/filters";
import ReportViewTabs from "@/sale_report/components/report-view-tabs";
import SalesReportDataTable, {
  type SalesReportTableResult,
} from "@/sale_report/components/table/client";
import { columns } from "@/sale_report/components/table/columns";
import { salesReportDocumentQueryFromSearchParams } from "@/sale_report/search-params";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import { DataTableSkeleton } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type ReportParams = Record<string, string | string[] | undefined>;

async function loadDocuments(
  query: SearchParams,
  countPromise: ReturnType<typeof getTotal>,
): Promise<SalesReportTableResult | null> {
  const [documentsResponse, countResponse] = await Promise.all([
    getMany(query),
    countPromise,
  ]);

  if (!documentsResponse.success || !countResponse.success) return null;

  return {
    data: documentsResponse.data,
    pageCount: Math.ceil(countResponse.data / (query.pageSize ?? 10)),
  };
}

async function SalesCount({
  countPromise,
}: {
  countPromise: ReturnType<typeof getTotal>;
}) {
  const countResponse = await countPromise;
  return <>{countResponse.success ? countResponse.data : "—"}</>;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ReportParams>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (!session.user) return <SignOutRedirection />;

  const query = salesReportDocumentQueryFromSearchParams(
    params,
    session.user.companyId,
  );
  const countPromise = getTotal(query);
  const documentsPromise = loadDocuments(query, countPromise);

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-8 p-4 pt-6 md:p-8">
      <PageHeader>
        <PageHeader.Navigation aria-label="Ruta de navegación">
          <Link
            href="/dashboard"
            className="hover:text-foreground hover:underline"
          >
            Inicio
          </Link>
          <ChevronRight aria-hidden="true" className="size-4" />
          <span aria-current="page" className="text-foreground">
            Reporte de ventas
          </span>
        </PageHeader.Navigation>
        <PageHeader.Main>
          <PageHeader.Heading>
            <PageHeader.Title>
              Reporte de ventas
              <span className="text-base font-normal tabular-nums text-muted-foreground">
                <Suspense fallback="—">
                  <SalesCount countPromise={countPromise} />
                </Suspense>
              </span>
            </PageHeader.Title>
            <PageHeader.Description>
              Consulta, filtra y exporta los comprobantes emitidos.
            </PageHeader.Description>
          </PageHeader.Heading>
          <PageHeader.Actions>
            <ReportViewTabs current="sales" searchParams={params} />
            <DownloadXLSXButton
              queryString={objectToQueryString(
                params as Record<string, string>,
              )}
            />
          </PageHeader.Actions>
        </PageHeader.Main>
      </PageHeader>
      <Suspense
        fallback={<div className="h-[5.375rem] rounded-lg border bg-card" />}
      >
        <Filters searchParams={params} />
      </Suspense>
      <Suspense
        fallback={
          <DataTableSkeleton columns={columns} caption="Ventas emitidas" />
        }
      >
        <SalesReportDataTable resultPromise={documentsPromise} />
      </Suspense>
    </main>
  );
}
