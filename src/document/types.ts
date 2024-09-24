export const INVOICE = "invoice";
export type InvoiceType = typeof INVOICE;
export const RECEIPT = "receipt";
export type ReceiptType = typeof RECEIPT;
export const TICKET = "ticket";
export type TicketType = typeof TICKET;
export type DocumentType = InvoiceType | ReceiptType | TicketType;

type DocumentBase = {
  id: string;
  orderId: string;
  netTotal: number;
  taxTotal: number;
  total: number;
  documentType: DocumentType;
  series: string;
  number: string;
  dateOfIssue: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

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
