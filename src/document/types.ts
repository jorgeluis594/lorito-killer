import { Customer } from "@/customer/types";
import {Status} from "@/order/types";

export const INVOICE = "invoice";
export type InvoiceType = typeof INVOICE;
export const RECEIPT = "receipt";
export type ReceiptType = typeof RECEIPT;
export const TICKET = "ticket";
export type TicketType = typeof TICKET;
export type DocumentType = InvoiceType | ReceiptType | TicketType;

export type DocumentStatus = "registered" | "cancelled" | "pending_cancellation";

type StatusAttributes = {
  status: Omit<DocumentStatus, "cancelled">
} | {
  status: "cancelled",
  cancellationReason: string,
}

type DocumentBase = {
  id: string;
  companyId: string;
  orderId: string;
  netTotal: number;
  taxTotal: number;
  discountAmount: number;
  total: number;
  documentType: DocumentType;
  series: string;
  number: string;
  customer?: Customer;
  dateOfIssue: Date;
  createdAt?: Date;
  updatedAt?: Date;
} & StatusAttributes;

export type Invoice = DocumentBase & {
  customerId: string;
  documentType: InvoiceType;
  qr: string;
  hash: string;
};

export type Receipt = DocumentBase & {
  documentType: ReceiptType;
  customerId?: string;
  qr: string;
  hash: string;
};

export type Ticket = DocumentBase & {
  customerId?: string;
  documentType: TicketType;
};

export type Document = Invoice | Receipt | Ticket;

export type BillingCredentials = {
  billingToken?: string;
  customerSearchToken: string;
  invoiceSerialNumber?: string;
  invoiceStartsOnNumber?: number;
  receiptSerialNumber?: string;
  receiptStartsOnNumber?: number;
  ticketSerialNumber: string;
  establishmentCode?: string;
};

type DocumentMapper = {
  [INVOICE]: Invoice;
  [RECEIPT]: Receipt;
  [TICKET]: Ticket;
};

export type InferDocumentType<T extends keyof DocumentMapper> =
  DocumentMapper[T];

export type SearchParams = {
  companyId: string;
  pageNumber?: number;
  pageSize?: number;
  correlative?: { number: string; series: string };
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  invoice?: boolean;
  receipt?: boolean;
  ticket?: boolean;
  orderId?: string | string[];
};

export type Registered<T extends Document> = T & { status: "registered" };

export type RegisteredTicket = Registered<Ticket>

export type RegisteredReceipt = Registered<Receipt>

export type RegisteredInvoince = Registered<Invoice>