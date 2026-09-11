"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RefreshButton } from "@/dashboard/components/refresh-button";
import useUpdateQueryString from "@/lib/use-update-query-string";
import ProductSelector from "@/product/components/form/product-selector";
import { SingleProductType, type SingleProduct } from "@/product/types";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/ui/data-table";
import { FilterBar } from "@/shared/components/ui/filter-bar";
import { columns } from "@/stock-transfer/components/table/columns";
import type { StockTransfer } from "@/stock-transfer/types";

export type StockTransfersTableResult = {
  data: StockTransfer[];
  pageCount: number;
  selectedProduct?: SingleProduct;
};

export function StockTransfersDataTable({
  resultPromise,
}: {
  resultPromise: Promise<StockTransfersTableResult | null>;
}) {
  const result = use(resultPromise);
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  if (!result) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-5">
        <p className="font-bold">No pudimos cargar los movimientos.</p>
        <p className="text-sm text-muted-foreground">
          Intenta nuevamente. Si el problema continúa, comunícate con soporte.
        </p>
        <RefreshButton />
      </div>
    );
  }

  const { data, pageCount } = result;
  const productId = searchParams.get("productId");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FilterBar
        role="group"
        aria-label="Filtros de movimientos de stock"
        control={
          <ProductSelector
            value={result.selectedProduct}
            productType={SingleProductType}
            onSelect={(product) =>
              updateRoute({ productId: product.id!, page: null })
            }
            onClick={() => updateRoute({ productId: null, page: null })}
          />
        }
      />
      <DataTable
        data={data}
        columns={columns}
        caption="Movimientos de stock"
        getRowId={(transfer) => transfer.id}
        emptyMessage={
          productId
            ? "No hay movimientos para el producto seleccionado."
            : "Aún no hay movimientos de stock. Registra el primero con Nuevo ajuste."
        }
      />
      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {data.length} {data.length === 1 ? "movimiento" : "movimientos"} en
            esta página
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
