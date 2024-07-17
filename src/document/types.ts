export type IssuerData = {
  establishmentCode: string;
}

export type CustomerDocumentType = "1" | "0" | "4" | "6" | "7" | "A";

export type DomainDocumentType = 'ruc' | 'dni' | 'foreign_card' | 'passport' | 'diplomatic_identity_card' | 'sin_ruc'

export type DomainCustomer = {
  documentType: DomainDocumentType;
  documentNumber: string;
  legalName: string;
  countyCode: string;
  address: string;
  email: string;
  phoneNumber: string;
}

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