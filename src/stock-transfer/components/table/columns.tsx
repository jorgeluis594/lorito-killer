"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  AdjustmentStockTransfer,
  OrderStockTransferName,
  ProductMovementStockTransferName,
  StockTransfer,
} from "@/stock-transfer/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const typeSpanishMapper = {
  [OrderStockTransferName]: "Venta POS",
  [AdjustmentStockTransfer]: "Ajuste de stock",
  [ProductMovementStockTransferName]: "Movimiento de producto",
};

export const columns: ColumnDef<StockTransfer & { productName: string }>[] = [
  {
    accessorKey: "productName",
    header: "NOMBRE DE PRODUCTO",
  },
  {
    accessorKey: "type",
    header: "TIPO DE MOVIMIENTO DE STOCK",
    cell: ({ row }) => typeSpanishMapper[row.original.type],
  },
  {
    accessorKey: "value",
    header: "VALOR",
  },
  {
    accessorKey: "createdAt",
    header: "FECHA",
    cell: ({ row }) =>
      format(row.original.createdAt, "PPP h:mm a", { locale: es }),
  },
];
