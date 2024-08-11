import { DocumentType, Order } from "@/order/types";
import { Customer } from "@/customer/types";

export type IssuerData = {
  establishmentCode: string;
};

export type PaymentTerm = {
  description?: string;
  type: string;
};

export type TotalPay = {
  totalExport?: number;
  totalTaxes?: number;
  totallyUnaffected?: number;
  totalExonerated?: number;
  totallyFree?: number;
  totalTax?: number;
  totalSale?: number;
};

export type FormatPdf = {
  formatPdf: string;
};

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
  order: Order;
  customer: Customer;
  observations: string;
  createdAt?: Date;
  updatedAt?: Date;
};
