"use client";

import { columns } from "@/cash-shift/components/data-table/columns";
import { DataTable } from "@/shared/components/ui/data-table";
import { use } from "react";
import { CashShiftWithOutOrders } from "@/cash-shift/types";
import { RefreshButton } from "@/dashboard/components/refresh-button";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import useUpdateQueryString from "@/lib/use-update-query-string";

export type CashShiftsTableResult = {
  data: CashShiftWithOutOrders[];
  pageCount: number;
};

type TableClientProps = {
  cashShiftsPromise: Promise<CashShiftsTableResult | null>;
};

export default function TableClient({ cashShiftsPromise }: TableClientProps) {
  const result = use(cashShiftsPromise);
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const requestedPage = Number(searchParams.get("page"));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  if (!result) {
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

  const { data, pageCount } = result;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <DataTable
        data={data}
        columns={columns}
        caption="Historial de cajas"
        getRowId={(cashShift) => cashShift.id}
        emptyMessage="Aún no hay cajas registradas. Abre una caja para comenzar."
      />
      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {data.length} {data.length === 1 ? "caja" : "cajas"} en esta página
          </span>
          <div className="flex items-center gap-2">
            <span className="mr-2 tabular-nums">
              Página {page} de {pageCount}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => updateRoute({ page: page - 1 })}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Página siguiente"
              disabled={page >= pageCount}
              onClick={() => updateRoute({ page: page + 1 })}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
