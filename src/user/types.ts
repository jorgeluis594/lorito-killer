export type User = {
  id: string;
  companyId: string;
  name?: string | null;
  email: string;
};

export type CreateUserParams = {
  id?: string;
  name?: string | null;
  companyId: string;
  email: string;
  password: string;
};
