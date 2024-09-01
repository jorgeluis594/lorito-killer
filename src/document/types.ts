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
};

export type Receipt = DocumentBase & {
  documentType: ReceiptType;
};

export type Ticket = DocumentBase & {
  documentType: TicketType;
};

export type Document = Invoice | Receipt | Ticket;

export type BillingCredentials = {
  token: string;
  invoiceSerialNumber: string;
  receiptSerialNumber: string;
  ticketSerialNumber: string;
  establishmentCode: string;
};
