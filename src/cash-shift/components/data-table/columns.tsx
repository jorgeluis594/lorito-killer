"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { CashShiftWithOutOrders } from "@/cash-shift/types";
import { format } from "date-fns";

export const columns: ColumnDef<CashShiftWithOutOrders>[] = [
  {
    accessorKey: "seller",
    header: "VENDEDOR",
  },
  {
    accessorKey: "openedAt",
    header: "APERTURA",
    cell: ({ row }) =>
      format(new Date(row.original.openedAt), "dd/MM/yyyy hh:mm aa"),
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
