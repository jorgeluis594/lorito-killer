export type Seller = {
  id: string;
  companyId: string;
  name: string | null;
  email: string;
  active: boolean;
  sellerCode: string;
};

export type CreateSellerParams = {
  companyId: string;
  email: string;
  password: string;
  name?: string | null;
  sellerCode: string;
};
