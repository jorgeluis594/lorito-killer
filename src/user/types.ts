export type User = {
  id?: string;
  name?: string | null;
  email: string;
};

export type CreateUserParams = {
  password: string;
} & User;
