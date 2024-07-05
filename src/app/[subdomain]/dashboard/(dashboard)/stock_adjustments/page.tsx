import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import { DataTable } from "@/stock-transfer/components/table/client";
import { columns } from "@/stock-transfer/components/table/columns";
import { getMany, total } from "@/stock-transfer/db_repository";
import { getSession } from "@/lib/auth";
import AddStockAdjustmentModal from "@/stock-transfer/components/add-stock-adjustment-modal";

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
  const resultStockTransfers = await getMany(
    session.user.companyId,
    page,
    pageLimit,
  );

  if (!resultStockTransfers.success) {
    return;
  }

  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex items-start justify-between">
        <Heading
          title="Movimientos de Stock"
          description="Agrega o regulariza el stock de tus productos"
        />
      </div>
      <Separator />
      <div className="flex flex-row space-x-12 space-y-0 mt-8">
        <aside className="w-1/5">
          <AddStockAdjustmentModal />
        </aside>
        <div className="flex-1 lg:max-w-5xl mt-6">
          <DataTable
            data={resultStockTransfers.data}
            columns={columns}
            pageCount={1}
          />
        </div>
      </div>
    </div>
  );
}
