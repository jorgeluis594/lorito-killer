"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Document } from "@/document/types";
import { Customer } from "@/customer/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { correlative } from "@/document/utils";
import { fullName } from "@/customer/utils";
import { formatPrice } from "@/lib/utils";
import {buttonVariants} from "@/shared/components/ui/button";
import {Printer} from "lucide-react";

export const columns: ColumnDef<Document & { customer?: Customer }>[] = [
  {
    accessorKey: "serialNumber",
    header: "CORRELATIVO",
    cell: ({ row }) => correlative(row.original),
  },
  {
    accessorKey: "customerName",
    header: "CLIENTE",
    cell: ({ row }) =>
      row.original.customer
        ? fullName(row.original.customer)
        : "Cliente general",
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
    cell: ({ row }) => formatPrice(row.original.total),
  },
  {
    accessorKey: "descarga",
    header: "",
    cell: ({row}) => <a
        className={buttonVariants({variant: "ghost", size: "icon"})}
        href={`/api/orders/${row.original.id}/documents`}
        target="_blank"
        rel="noopener noreferrer"
    >
      <Printer className="cursor-pointer"/>
    </a>,
  },
];
