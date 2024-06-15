"use client";

import { ColumnDef } from "@tanstack/react-table";
import { StockTransfer } from "@/stock-transfer/types";

export const columns: ColumnDef<StockTransfer & { productName: string }>[] = [
  {
    accessorKey: "productName",
    header: "NOMBRE",
  },
  {
    accessorKey: "value",
    header: "VALOR",
  },
  {
    accessorKey: "createdAt",
    header: "FECHA",
  },
];
