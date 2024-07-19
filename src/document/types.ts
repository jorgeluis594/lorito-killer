export type IssuerData = {
  establishmentCode: string;
}

export const DNI = "dni";
export type DniType = typeof DNI;

export const RUC = "ruc"
export type RucType = typeof RUC

export type DocumentType = DniType | RucType;

export type NaturalCustomer = {
  id: string;
  documentType: DniType;
  documentNumber?: string;
  email?: string;
  name?: string;
  address?: string;
  phoneNumber?: string;
}

export type BusinessCustomer = {
  id: string;
  documentType: RucType;
  documentNumber: string;
  email: string;
  legalName: string;
  address: string;
  phoneNumber: string;
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

export type Document ={

}