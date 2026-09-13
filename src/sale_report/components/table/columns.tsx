"use client";

import { walletPaymentReference } from "@/order/wallet-payment";
import type { Customer } from "@/customer/types";
import { fullName } from "@/customer/utils";
import type {
  DocumentType,
  SalesReportDocument as ReportDocument,
} from "@/document/types";
import { correlative } from "@/document/utils";
import { formatPrice } from "@/lib/utils";
import ReceiptPrintButton from "@/printing/components/receipt-print-button";
import { buttonVariants } from "@/shared/components/ui/button";
import type { TableColumn } from "@/shared/components/ui/data-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileCode } from "lucide-react";
import CancelOrderButton from "@/order/components/cancel-order-button";

export type SalesReportDocument = ReportDocument & { canCancel: boolean };

const documentLabels: Record<DocumentType, string> = {
  invoice: "Factura",
  receipt: "Boleta",
  ticket: "Nota de venta",
};

export const columns: TableColumn<SalesReportDocument>[] = [
  {
    id: "correlative",
    header: "Correlativo",
    cell: correlative,
    mobile: "title",
    className: "font-medium",
  },
  {
    id: "customer",
    header: "Cliente",
    cell: (document) =>
      document.customer ? fullName(document.customer) : "Cliente general",
    mobile: "description",
  },
  {
    id: "documentType",
    header: "Tipo",
    cell: (document) => documentLabels[document.documentType],
    mobile: "description",
  },
  {
    id: "dateOfIssue",
    header: "Emisión",
    cell: (document) =>
      format(document.dateOfIssue, "dd/MM/yyyy", { locale: es }),
    mobile: "description",
  },
  {
    id: "walletReference",
    header: "Billetera / operación",
    cell: (document) => (
      <span className="whitespace-normal break-words">
        {document.payments
          ?.map(walletPaymentReference)
          .filter(Boolean)
          .join("; ") || "—"}
      </span>
    ),
    mobile: "description",
  },
  {
    id: "total",
    header: "Total",
    cell: (document) => formatPrice(document.total),
    align: "right",
    mobile: "value",
  },
  {
    id: "actions",
    header: "Acciones",
    align: "right",
    mobile: "actions",
    cell: (document) => (
      <div className="flex items-center justify-end gap-1">
        <ReceiptPrintButton orderId={document.orderId} />
        {document.documentType !== "ticket" && document.xml ? (
          <a
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            href={document.xml}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Descargar XML de ${correlative(document)}`}
          >
            <FileCode aria-hidden="true" className="size-4" />
          </a>
        ) : null}
        {document.canCancel ? (
          <CancelOrderButton
            orderId={document.orderId}
            label={correlative(document)}
          />
        ) : null}
      </div>
    ),
  },
];
