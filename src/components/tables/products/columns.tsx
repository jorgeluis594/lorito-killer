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
    header: "CÓDIGO",
  },
  {
    accessorKey: "stock",
    header: "CANTIDAD",
  },
  {
    accessorKey: "price",
    header: "PRECIO",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <CellAction product={row.original} />,
  },
];
