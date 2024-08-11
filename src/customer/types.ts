export const DNI = "dni";

export type DniType = typeof DNI;

export const RUC = "ruc";

export type RucType = typeof RUC;

export type CustomerDocumentType = DniType | RucType;

export type NaturalCustomer = {
  id: string;
  documentType: DniType;
  documentNumber?: string;
  fullName: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
};

export type BusinessCustomer = {
  id: string;
  documentType: RucType;
  documentNumber: string;
  legalName: string;
  address: string;
  email: string;
  phoneNumber: string;
};

export type Customer = NaturalCustomer | BusinessCustomer;
