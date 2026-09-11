"use client";

import { columns } from "@/cash-shift/components/data-table/columns";
import { DataTable } from "@/shared/components/ui/data-table";
import { use } from "react";
import { CashShiftWithOutOrders } from "@/cash-shift/types";
import { response } from "@/lib/types";
import { RefreshButton } from "@/dashboard/components/refresh-button";

type TableClientProps = {
  cashShiftsPromise: Promise<response<CashShiftWithOutOrders[]>>;
};

export default function TableClient({ cashShiftsPromise }: TableClientProps) {
  const cashShiftsResponse = use(cashShiftsPromise);

  if (!cashShiftsResponse.success) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-5">
        <p className="font-bold">No pudimos cargar las cajas.</p>
        <p className="text-sm text-muted-foreground">
          Intenta nuevamente. Si el problema continúa, comunícate con soporte.
        </p>
        <RefreshButton />
      </div>
    );
  }

  return (
    <DataTable
      data={cashShiftsResponse.data}
      columns={columns}
      caption="Historial de cajas"
      getRowId={(cashShift) => cashShift.id}
      emptyMessage="Aún no hay cajas registradas. Abre una caja para comenzar."
    />
  );
}
