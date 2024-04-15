"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { CashShift } from "@/cash-shift/types";

export const columns: ColumnDef<CashShift>[] = [
  {
    accessorKey: "seller",
    header: "VENDEDOR",
  },
  {
    accessorKey: "createdAt",
    header: "APERTURA",
  },
  {
    accessorKey: "closedAt",
    header: "CIERRE",
  },
  {
    accessorKey: "initialAmount",
    header: "SALDO INICIAL",
  },
  {
    accessorKey: "finalAmount",
    header: "SALDO FINAL",
  },
  {
    accessorKey: "status",
    header: "ESTADO",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <CellAction cashShift={row.original} />,
  },
];