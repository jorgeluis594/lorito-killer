"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Category } from "@/category/types";

export const columns: ColumnDef<Category>[] = [
  {
    accessorKey: "name",
    header: "NOMBRE",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <CellAction category={row.original} />,
  },
];
