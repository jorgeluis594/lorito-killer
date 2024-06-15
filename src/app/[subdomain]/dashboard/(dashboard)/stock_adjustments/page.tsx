import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import { DataTable } from "@/stock-transfer/components/table/client";
import { columns } from "@/stock-transfer/components/table/columns";

const breadcrumbItems = [
  { title: "Ajustes de stock", link: "/stock_adjustments" },
];

export default async function Page() {
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
        <DataTable data={[]} columns={columns} pageCount={1} />
      </div>
    </div>
  );
}
