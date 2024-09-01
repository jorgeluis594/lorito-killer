export const DNI = "dni";

export type DniType = typeof DNI;

export const RUC = "ruc";

export type RucType = typeof RUC;

export type CustomerDocumentType = DniType | RucType;

export type NaturalCustomer = {
  _branch: "NaturalCustomer";
  id: string;
  companyId: string;
  documentType?: DniType;
  documentNumber?: string;
  geoCode?: string;
  fullName: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
  updatedAt?: Date;
  createdAt?: Date;
};

export type BusinessCustomer = {
  _branch: "BusinessCustomer";
  id: string;
  companyId: string;
  documentType: RucType;
  documentNumber: string;
  legalName: string;
  address: string;
  geoCode: string;
  email: string;
  phoneNumber: string;
  updatedAt?: Date;
  createdAt?: Date;
};

export const NaturalCustomerType = "NaturalCustomer";
export type TypeNaturalCustomerType = typeof NaturalCustomerType;

export const BusinessCustomerType = "BusinessCustomer";
export type TypeBusinessCustomerType = typeof BusinessCustomerType;

export type Customer = NaturalCustomer | BusinessCustomer;

type CustomerTypeMap = {
  [NaturalCustomerType]: NaturalCustomer;
  [BusinessCustomerType]: BusinessCustomer;
};

export type CustomerType = keyof CustomerTypeMap;
export type InferCustomerType<T extends CustomerType | undefined> =
  T extends CustomerType ? CustomerTypeMap[T] : Customer;

export type GetManyParamsCustomer<
  T extends CustomerType | undefined = undefined,
> = {
  q?: string | null;
  customerType?: T;
};
