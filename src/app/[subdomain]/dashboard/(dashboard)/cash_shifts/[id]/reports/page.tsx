import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import CashShiftReportTw from "@/cash-shift/cash-shift-report-tailwind";
import { findCashShift } from "@/cash-shift/db_repository";
import { notFound } from "next/navigation";
import { CashShift } from "@/cash-shift/types";
import {Suspense} from "react";

const breadcrumbItems = [
  { title: "Caja chica", link: "/cash_shifts" },
  { title: "Reportes", link: "/" },
];

export default async function Page(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;

  const {
    id
  } = params;

  const cashShiftFoundResponse = await findCashShift<CashShift>(id);
  if (!cashShiftFoundResponse.success) {
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
        <Suspense fallback={<div>Loading...</div>}>
          <CashShiftReportTw cashShift={cashShiftFoundResponse.data} />
        </Suspense>
      </div>
    </div>
  );
}
