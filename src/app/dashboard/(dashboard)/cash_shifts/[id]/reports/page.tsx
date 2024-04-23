import BreadCrumb from "@/components/breadcrumb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import CashShiftReportTw from "@/cash-shift/cash-shift-report-tailwind";
import { findCashShift } from "@/cash-shift/db_repository";
import { notFound } from "next/navigation";
import { CashShift } from "@/cash-shift/types";

const breadcrumbItems = [{ title: "Caja chica", link: "/cash_shifts" }];

export default async function Page({
  params: { id },
}: {
  params: { id: string };
}) {
  const cashShiftFoundResponse = await findCashShift<CashShift>(id);
  if (!cashShiftFoundResponse.success) {
    return notFound();
  }

  if (cashShiftFoundResponse.data.status !== "closed") {
    return notFound();
  }

  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />
      <div className="flex items-start justify-between">
        <Heading title="Reportes" description="Manten al día tus cuentas" />
      </div>
      <Separator />
      <div className="h-[calc(100vh-theme(space.64))]">
        <CashShiftReportTw cashShift={cashShiftFoundResponse.data} />
      </div>
    </div>
  );
}
