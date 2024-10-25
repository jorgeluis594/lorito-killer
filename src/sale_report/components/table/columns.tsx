"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Document } from "@/document/types";
import { Customer } from "@/customer/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { correlative } from "@/document/utils";
import { fullName } from "@/customer/utils";

export const columns: ColumnDef<Document & { customer: Customer }>[] = [
  {
    accessorKey: "serialNumber",
    header: "CORRELATIVO",
    cell: ({ row }) => correlative(row.original),
  },
  {
    accessorKey: "customerName",
    header: "CLIENTE",
    cell: ({ row }) => fullName(row.original.customer),
  },
  {
    accessorKey: "dateOfIssue",
    header: "CREACIÓN",
    cell: ({ row }) =>
      format(row.original.dateOfIssue, "dd/MM/yyyy", { locale: es }),
  },
  {
    accessorKey: "total",
    header: "TOTAL",
  },
];
