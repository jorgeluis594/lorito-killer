import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import DataTable from "@/sale_report/components/table/client";
import { columns } from "@/sale_report/components/table/columns";
import { getSession } from "@/lib/auth";
import { getMany, getTotal } from "@/document/db_repository";
import type { SearchParams } from "@/document/types";
import { Suspense } from "react";
import Filters from "@/sale_report/components/filter/filters";
import DownloadXLSXButton from "@/sale_report/components/download_xlsx_button";
import { errorResponse, objectToQueryString } from "@/lib/utils";
import { response } from "@/lib/types";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import ReportViewTabs from "@/sale_report/components/report-view-tabs";
import { salesReportDocumentQueryFromSearchParams } from "@/sale_report/search-params";

export const dynamic = "force-dynamic";

const breadcrumbItems = [
  { title: "Reporte de ventas", link: "/sales_reports" },
];

type PageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

type ResolvedSearchParams = {
  searchParams: { [key: string]: string | string[] | undefined };
};

const getSearchParams = async ({
  searchParams,
}: ResolvedSearchParams): Promise<response<SearchParams>> => {
  const session = await getSession();
  if (!session.user)
    return errorResponse("Usuario no autenticado", "AuthError");

  return {
    success: true,
    data: salesReportDocumentQueryFromSearchParams(
      searchParams,
      session.user.companyId,
    ),
  };
};

async function DocumentsWithSuspense({ searchParams }: ResolvedSearchParams) {
  const documentQuery = await getSearchParams({ searchParams });
  if (!documentQuery.success) {
    return <SignOutRedirection />;
  }

  const [documentsResponse, documentCountResponse] = await Promise.all([
    getMany(documentQuery.data),
    getTotal(documentQuery.data),
  ]);

  if (!documentsResponse.success || !documentCountResponse.success) {
    return <p>Error cargando los documentos, comuniquese con soporte</p>;
  }

  return (
    <DataTable
      data={documentsResponse.data}
      columns={columns}
      pageCount={Math.ceil(
        documentCountResponse.data / documentQuery.data.pageSize!,
      )}
    />
  );
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;

  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Heading title="Reporte de ventas" />
        <ReportViewTabs current="sales" searchParams={searchParams} />
      </div>
      <Separator />
      <div className="items-center md:flex md:flex-row md:space-x-12 md:space-y-0 md:mt-8">
        <aside className="md:w-1/5">
          <DownloadXLSXButton
            queryString={objectToQueryString(
              searchParams as Record<string, string>,
            )}
          />
          <Filters searchParams={searchParams} />
        </aside>
        <div className="flex-1 lg:max-w-7xl mt-6">
          <Suspense
            fallback={<DataTable loading columns={columns} pageCount={1} />}
          >
            <DocumentsWithSuspense searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
