"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { CashShiftWithOutOrders, ClosedCashShift } from "@/cash-shift/types";
import { format } from "date-fns";

const statusSpanishMapper = {
  open: "Abierto",
  closed: "Cerrado",
};

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
    cell: ({ row }) => {
      const cashShift = row.original;
      if (cashShift.status === "closed") {
        const closedCashShift = cashShift as ClosedCashShift;
        return format(
          new Date(closedCashShift.closedAt),
          "dd/MM/yyyy hh:mm aa",
        );
      } else {
        return "-";
      }
    },
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
    cell: ({ row }) => statusSpanishMapper[row.original.status],
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <CellAction cashShift={row.original} />,
  },
];
