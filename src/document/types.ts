export const INVOICE = "invoice";
export type InvoiceType = typeof INVOICE;
export const RECEIPT = "receipt";
export type ReceiptType = typeof RECEIPT;
export const TICKET = "ticket";
export type TicketType = typeof TICKET;
export type DocumentType = InvoiceType | ReceiptType | TicketType;

export type Document = {
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
