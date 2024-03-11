"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Checkbox } from "@/components/ui/checkbox";
import productInterface from "@/product/interface";

export const columns: ColumnDef<productInterface>[] = [
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
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
