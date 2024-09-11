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
  customerId: string;
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
  documentType: InvoiceType;
  qr: string;
  hash: string;
};

export type Receipt = DocumentBase & {
  documentType: ReceiptType;
  qr: string;
  hash: string;
};

export type Ticket = DocumentBase & {
  documentType: TicketType;
};

export type Document = Invoice | Receipt | Ticket;

export type BillingCredentials = {
  billingToken: string;
  customerSearchToken: string;
  invoiceSerialNumber: string;
  invoiceStartsOnNumber?: number;
  receiptSerialNumber: string;
  receiptStartsOnNumber?: number;
  ticketSerialNumber: string;
  establishmentCode: string;
};

export type FetchCustomer = {
  name: string;
  address: string;
};
