import BreadCrumb from "@/components/breadcrumb";
import { Heading } from "@/components/ui/heading";
import CashShiftForm from "@/cash-shift/components/open-cash-shift-form";
import { Separator } from "@/components/ui/separator";
import CashShiftClientTable from "@/cash-shift/components/data-table/client";

const breadcrumbItems = [{ title: "Caja chica", link: "/cash_shifts" }];

export default async function Page() {
  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />
      <div className="flex items-start justify-between">
        <Heading title="Caja chica" description="Gestiona tus cajas chicas!" />
        <CashShiftForm />
      </div>
      <Separator />
      <CashShiftClientTable />
    </div>
  );
}
