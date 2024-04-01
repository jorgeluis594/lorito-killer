export type User = {
  id: string;
  name?: string | null;
  email: string;
};

export type CreateUserParams = {
  id?: string;
  name?: string | null;
  email: string;
  password: string;
};
