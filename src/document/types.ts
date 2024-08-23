import { Customer } from "@/customer/types";

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
  total: number;
  documentType: DocumentType;
  series: string;
  number: string;
  dateOfIssue: string;
  broadcastTime: string;
  customer: Customer;
  observations: string;
  createdAt?: Date;
  updatedAt?: Date;
};
