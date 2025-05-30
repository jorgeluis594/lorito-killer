import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import { DataTable } from "@/stock-transfer/components/table/client";
import { columns } from "@/stock-transfer/components/table/columns";
import { getMany, total } from "@/stock-transfer/db_repository";
import { getSession } from "@/lib/auth";
import AddStockAdjustmentModal from "@/stock-transfer/components/add-stock-adjustment-modal";
import SignOutRedirection from "@/shared/components/sign-out-redirection";

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
  if (!session.user) return <SignOutRedirection />;

  const resultStockTransfers = await getMany({
    companyId: session.user.companyId,
    page,
    pageLimit,
  });

  if (!resultStockTransfers.success) {
    return;
  }

  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex flex-col md:flex-row md:items-start md:justify-between">
        <Heading
          title="Movimientos de Stock"
          description="Agrega o regulariza el stock de tus productos"
        />
        <div className="flex justify-center mt-4">
          <AddStockAdjustmentModal />
        </div>
      </div>
      <Separator />
      <div className="flex flex-row space-x-12 space-y-0 mt-8">
        <div className="flex-1 mt-6">
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
