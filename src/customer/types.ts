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

export type CustomerItem = {
  id: string;
  customerId: string;
  fullName: string;
};

export type GetManyParamsCustomer<T extends CustomerType | undefined = undefined> = {
  q?: string | null;
  limit?: number;
  sortBy?: SortKeyCustomer;
  customerType?: T;
};

// TODO: Add sort params for package product
export type CustomerSortParams = {
  companyId?: "asc" | "desc";
  documentType?: "asc" | "desc";
  documentNumber?: "asc" | "desc";
  geoCode?: "asc" | "desc";
  fullName?: "asc" | "desc";
  legalName?: "asc" | "desc";
  address?: "asc" | "desc";
  email?: "asc" | "desc";
  phoneNumber?: "asc" | "desc";
  updatedAt?: "asc" | "desc";
  createdAt?: "asc" | "desc";
};

export type SortOptionsCustomer = {
  [key in "fullName_asc" | "created_desc"]?: {
    name: string;
    value: CustomerSortParams;
  };
};

export type SortKeyCustomer = keyof SortOptionsCustomer;

export const sortOptionsCustomer: SortOptionsCustomer = {
  fullName_asc: { name: "Alfabéticamente", value: { fullName: "asc" } },
  created_desc: { name: "Creado Descendente", value: { createdAt: "desc" } },
};