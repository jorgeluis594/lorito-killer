"use client";

import { CellAction } from "./cell-action";
import { CashShiftWithOutOrders, ClosedCashShift } from "@/cash-shift/types";
import { format } from "date-fns";
import { TableColumn } from "@/shared/components/ui/data-table";
import { Badge } from "@/shared/components/ui/badge";
import { formatPrice } from "@/lib/utils";

const statusSpanishMapper = {
  open: "Abierto",
  closed: "Cerrado",
};

export const columns: TableColumn<CashShiftWithOutOrders>[] = [
  {
    id: "userName",
    header: "Vendedor",
    cell: (cashShift) => cashShift.userName,
    mobile: "title",
  },
  {
    id: "openedAt",
    header: "Apertura",
    cell: (cashShift) =>
      format(new Date(cashShift.openedAt), "dd/MM/yyyy hh:mm aa"),
    mobile: "description",
  },
  {
    id: "closedAt",
    header: "Cierre",
    cell: (cashShift) =>
      cashShift.status === "closed"
        ? format(
            new Date((cashShift as ClosedCashShift).closedAt),
            "dd/MM/yyyy hh:mm aa",
          )
        : "—",
    mobile: "description",
  },
  {
    id: "initialAmount",
    header: "Saldo inicial",
    align: "right",
    cell: (cashShift) => formatPrice(cashShift.initialAmount),
  },
  {
    id: "finalAmount",
    header: "Saldo final",
    align: "right",
    cell: (cashShift) =>
      cashShift.status === "closed"
        ? formatPrice((cashShift as ClosedCashShift).finalAmount)
        : "—",
    mobile: "value",
  },
  {
    id: "status",
    header: "Estado",
    cell: (cashShift) => (
      <Badge variant={cashShift.status === "open" ? "secondary" : "outline"}>
        {statusSpanishMapper[cashShift.status]}
      </Badge>
    ),
    mobile: "description",
  },
  {
    id: "actions",
    header: <span className="sr-only">Acciones</span>,
    align: "right",
    cell: (cashShift) => <CellAction cashShift={cashShift} />,
    mobile: "actions",
  },
];
