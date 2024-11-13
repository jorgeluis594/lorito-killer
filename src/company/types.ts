export type Company = {
  id: string;
  name: string;
  subName?: string;
  department?: string;
  district?: string;
  provincial?: string;
  phone: string;
  email: string;
  ruc?: string;
  address: string;
  subdomain: string;
  isBillingActivated: boolean;
  logo?: Logo;
};

export type Logo = {
  id: string;
  companyId: string;
  name: string;
  size: number;
  type: string;
  key: string;
  url: string;
  createdAt?: Date;
};
