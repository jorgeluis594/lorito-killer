"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Product } from "@/product/types";

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "NOMBRE",
  },
  {
    accessorKey: "sku",
    header: "SKU",
  },
  {
    accessorKey: "stock",
    header: "STOCK",
  },
  {
    accessorKey: "price",
    header: "PRECIO",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction product={row.original} />,
  },
];
