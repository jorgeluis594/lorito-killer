import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import { DataTable } from "@/stock-transfer/components/table/client";
import { columns } from "@/stock-transfer/components/table/columns";
import { getMany, total } from "@/stock-transfer/db_repository";
import { getSession } from "@/lib/auth";

const breadcrumbItems = [
  { title: "Ajustes de stock", link: "/stock_adjustments" },
];

type paramsProps = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

export default async function Page({ searchParams }: paramsProps) {
  const page = Number(searchParams.page) || 1;
  const pageLimit = Number(searchParams.limit) || 10;
  const session = await getSession();
  const [resultStockTransfers, totalCount] = await Promise.all([
    getMany(session.user.companyId, page, pageLimit),
    total(session.user.companyId),
  ]);

  if (!resultStockTransfers.success) {
    return;
  }

  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex items-start justify-between">
        <Heading
          title="Ajustes de Stock"
          description="Agregar o regulaiza el stock de tus productos"
        />
      </div>
      <Separator />
      <div className="w-3/4 mx-auto">
        <DataTable
          data={resultStockTransfers.data}
          columns={columns}
          pageCount={totalCount / pageLimit}
        />
      </div>
    </div>
  );
}
