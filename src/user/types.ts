import type { UserRole } from "@/authorization/types";

export type User = {
  id: string;
  companyId: string;
  name?: string | null;
  email: string;
  role: UserRole;
  active: boolean;
};

export type CreateUserParams = {
  id?: string;
  name?: string | null;
  companyId: string;
  email: string;
  password: string;
  role?: UserRole;
  active?: boolean;
  pin?: string | null;
};
