"use client";

import { RefreshButton } from "@/dashboard/components/refresh-button";
import useUpdateQueryString from "@/lib/use-update-query-string";
import {
  columns,
  type SalesReportDocument,
} from "@/sale_report/components/table/columns";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/ui/data-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { use } from "react";

export type SalesReportTableResult = {
  data: SalesReportDocument[];
  pageCount: number;
};

export default function SalesReportDataTable({
  resultPromise,
}: {
  resultPromise: Promise<SalesReportTableResult | null>;
}) {
  const result = use(resultPromise);
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const hasFilters = [
    "q",
    "customerId",
    "start",
    "end",
    "invoice",
    "receipt",
    "ticket",
  ].some((key) => searchParams.has(key));

  if (!result) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-5">
        <p className="font-bold">No pudimos cargar el reporte de ventas.</p>
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
        caption="Ventas emitidas"
        getRowId={(document) => document.id}
        emptyMessage={
          hasFilters ? (
            <div className="flex flex-col items-center gap-3">
              <span>No hay ventas que coincidan con los filtros.</span>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateRoute({
                    q: null,
                    customerId: null,
                    start: null,
                    end: null,
                    invoice: null,
                    receipt: null,
                    ticket: null,
                    page: null,
                  })
                }
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            "Aún no hay ventas registradas."
          )
        }
      />
      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {data.length} {data.length === 1 ? "venta" : "ventas"} en esta
            página
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
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Página siguiente"
              disabled={page >= pageCount}
              onClick={() => updateRoute({ page: page + 1 })}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
