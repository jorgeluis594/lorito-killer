import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import DataTable from "@/sale_report/components/table/client";
import { columns } from "@/sale_report/components/table/columns";
import { getSession } from "@/lib/auth";
import { getMany, getTotal } from "@/document/db_repository";
import { SearchParams } from "@/document/types";
import { Suspense } from "react";
import Filters from "@/sale_report/components/filter/filters";
import DownloadXLSXButton from "@/sale_report/components/download_xlsx_button";
import { errorResponse, objectToQueryString } from "@/lib/utils";
import { response } from "@/lib/types";
import SignOutRedirection from "@/shared/components/sign-out-redirection";

export const dynamic = "force-dynamic";

const breadcrumbItems = [
  { title: "Reporte de ventas", link: "/sales_reports" },
];

type ParamsProps = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

const getSearchParams = async ({
  searchParams,
}: ParamsProps): Promise<response<SearchParams>> => {
  const session = await getSession();
  if (!session.user)
    return errorResponse("Usuario no autenticado", "AuthError");

  const params: SearchParams = {
    companyId: session.user.companyId,
    pageNumber: Number(searchParams.page) || 1,
    pageSize: Number(searchParams.size) || 10,
  };

  if (searchParams.series && searchParams.number) {
    params.correlative = {
      number: searchParams.number as string,
      series: searchParams.series as string,
    };
  }

  if (searchParams.invoice && searchParams.invoice == "true") {
    params.invoice = true;
  }

  if (searchParams.receipt && searchParams.receipt == "true") {
    params.receipt = true;
  }

  if (searchParams.ticket && searchParams.ticket == "true") {
    params.ticket = true;
  }

  if (searchParams.start) {
    params.startDate = new Date(searchParams.start as string);
  }

  if (searchParams.end) {
    params.endDate = new Date(searchParams.end as string);
  }

  if (searchParams.customerId) {
    params.customerId = searchParams.customerId as string;
  }

  return { success: true, data: params };
};

async function DocumentsWithSuspense({ searchParams }: ParamsProps) {
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

export default async function Page({ searchParams }: ParamsProps) {
  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex items-start justify-between">
        <Heading title="Reporte de ventas" />
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
