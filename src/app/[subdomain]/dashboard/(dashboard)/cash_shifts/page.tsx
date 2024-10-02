import BreadCrumb from "@/shared/breadcrumb";
import CashShiftClientTable from "@/cash-shift/components/data-table/client";

const breadcrumbItems = [{ title: "Caja chica", link: "/cash_shifts" }];

export default async function Page() {
  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />
      <CashShiftClientTable />
    </div>
  );
}
