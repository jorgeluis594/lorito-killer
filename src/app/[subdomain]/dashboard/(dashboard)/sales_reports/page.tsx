import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import DataTable from "@/sale_report/components/table/client";
import { columns } from "@/sale_report/components/table/columns";
import { getSession } from "@/lib/auth";
import { Button } from "@/shared/components/ui/button";
import { Download } from "lucide-react";
import { getMany, getTotal } from "@/document/db_repository";
import { SearchParams } from "@/document/types";
import { Suspense } from "react";
import Filters from "@/sale_report/components/filter/filters";

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
}: ParamsProps): Promise<SearchParams> => {
  const session = await getSession();

  const params: SearchParams = {
    companyId: session.user.companyId,
    pageNumber: Number(searchParams.page) || 1,
    pageSize: Number(searchParams.size) || 2,
  };

  if (searchParams.series && searchParams.number) {
    params.correlative = {
      number: searchParams.number as string,
      series: searchParams.series as string,
    };
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

  return params;
};

async function DocumentsWithSuspense({ searchParams }: ParamsProps) {
  const documentQuery = await getSearchParams({ searchParams });
  const [documentsResponse, documentCountResponse] = await Promise.all([
    getMany(documentQuery),
    getTotal(documentQuery),
  ]);

  if (!documentsResponse.success || !documentCountResponse.success) {
    return <p>Error cargando los documentos, comuniquese con soporte</p>;
  }

  return (
    <DataTable
      data={documentsResponse.data}
      columns={columns}
      pageCount={Math.ceil(documentCountResponse.data / documentQuery.pageSize)}
    />
  );
}

/*
export default async function Page({ searchParams }: ParamsProps) {

  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex items-start justify-between">
        <Heading title="Reporte de ventas" />
      </div>
      <Separator />
      <div className="flex flex-row space-x-12 space-y-0 mt-8">
        <aside className="w-1/5">
          <Button type="button">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

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
*/

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { page } = await searchParams;
  return <p>{page}</p>;
}
