"use client";

import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/ui/data-table";
import { columns } from "@/product/components/data-table/columns";
import { Product } from "@/product/types";
import useUpdateQueryString from "@/lib/use-update-query-string";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import { RefreshButton } from "@/dashboard/components/refresh-button";

interface ProductsDataTableProps {
  resultPromise: Promise<ProductsTableResult | null>;
}

export type ProductsTableResult = {
  data: Product[];
  pageCount: number;
};

export function ProductsDataTable({ resultPromise }: ProductsDataTableProps) {
  const result = use(resultPromise);
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const hasFilters = ["q", "categoryId", "showHidden", "stock"].some((key) =>
    searchParams.has(key),
  );

  if (!result) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-5">
        <p className="font-bold">No pudimos cargar los productos.</p>
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
        caption="Productos del catálogo"
        getRowId={(product) => product.id!}
        emptyMessage={
          hasFilters ? (
            <div className="flex flex-col items-center gap-3">
              <span>No hay productos que coincidan con los filtros.</span>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateRoute({
                    q: null,
                    categoryId: null,
                    showHidden: null,
                    stock: null,
                    page: null,
                  })
                }
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            "Aún no hay productos en el catálogo. Usa Agregar para crear el primero."
          )
        }
        getRowClassName={(product: Product) =>
          product.hidden ? "bg-muted/20" : ""
        }
      />
      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {data.length} {data.length === 1 ? "producto" : "productos"} en esta
            página
          </span>
          <div className="flex items-center gap-2">
            <span className="mr-2 tabular-nums">
              Página {page} de {Math.max(pageCount, 1)}
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
