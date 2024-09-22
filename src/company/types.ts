export type Company = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
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