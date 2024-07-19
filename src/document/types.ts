export type IssuerData = {
  establishmentCode: string;
}

export const DNI = "dni";
export type DniType = typeof DNI;

export const RUC = "ruc"
export type RucType = typeof RUC

export type DocumentType = DniType | DocumentType;

export type NaturalCustomer = {
  documentType: DniType;
  documentNumber?: string;
  email?: string;
  name?: string;
  address?: string;
  cellphone?: string;
}

export type BusinessCustomer = {
  documentType: RucType;
  documentNumber: string;
  email: string;
  name: string;
  address: string;
  cellphone: string;
}

export type Customer = NaturalCustomer | BusinessCustomer

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