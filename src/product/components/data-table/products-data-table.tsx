"use client";

import DataTable from "@/sale_report/components/table/client";
import { columns } from "@/product/components/data-table/columns";
import { Product } from "@/product/types";

interface ProductsDataTableProps {
  data: Product[];
  pageCount: number;
}

export function ProductsDataTable({ data, pageCount }: ProductsDataTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchTextPlaceholder="Buscar producto por nombre o sku"
      pageCount={pageCount}
      allowSearch
      getRowClassName={(product: Product) =>
        product.hidden ? "opacity-60 bg-muted/10" : ""
      }
    />
  );
}
