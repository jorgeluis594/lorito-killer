"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/shared/components/ui/badge";
import type { TableColumn } from "@/shared/components/ui/data-table";
import {
  AdjustmentStockTransfer,
  OrderStockTransferName,
  ProductMovementStockTransferName,
  type StockTransfer,
} from "@/stock-transfer/types";

const typeLabels = {
  [OrderStockTransferName]: "Venta POS",
  [AdjustmentStockTransfer]: "Ajuste de stock",
  [ProductMovementStockTransferName]: "Movimiento de producto",
};

export const columns: TableColumn<StockTransfer>[] = [
  {
    id: "productName",
    header: "Producto",
    cell: (transfer) => transfer.productName,
    mobile: "title",
  },
  {
    id: "type",
    header: "Tipo",
    cell: (transfer) => (
      <Badge variant="secondary">{typeLabels[transfer.type]}</Badge>
    ),
    mobile: "description",
  },
  {
    id: "value",
    header: "Variación",
    align: "right",
    cell: (transfer) => (
      <span className="font-semibold">
        {transfer.value > 0 ? "+" : ""}
        {transfer.value}
      </span>
    ),
    mobile: "value",
  },
  {
    id: "userName",
    header: "Usuario",
    cell: (transfer) => transfer.userName || "—",
  },
  {
    id: "createdAt",
    header: "Fecha",
    cell: (transfer) =>
      format(transfer.createdAt, "d MMM yyyy, h:mm a", { locale: es }),
    mobile: "description",
  },
];
