import {Order, DocumentType} from "@/order/types";

export type IssuerData = {
  establishmentCode: string;
}

export const DNI = "dni";
export type DniType = typeof DNI;

export const RUC = "ruc"
export type RucType = typeof RUC

export type CustomerDocumentType = DniType | RucType;

export type NaturalCustomer = {
  id: string;
  orderId: string;
  documentType: DniType;
  documentNumber?: string;
  legalName: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
}

export type BusinessCustomer = {
  id: string;
  orderId: string;
  documentType: RucType;
  documentNumber: string;
  legalName: string;
  address: string;
  email: string;
  phoneNumber: string;
}

export type   Customer = NaturalCustomer | BusinessCustomer

export type PaymentTerm = {
  description?: string;
  type: string;
}

export type TotalPay = {
  totalExport?: number;
  totalTaxes?: number;
  totallyUnaffected?: number
  totalExonerated?: number;
  totallyFree?: number;
  totalTax?: number;
  totalSale?: number;
}

export type FormatPdf = {
  formatPdf: string;
}

export type Document ={
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
}