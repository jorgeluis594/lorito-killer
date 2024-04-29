import { Persisted } from "@/lib/types";

export type Category = {
  id?: string;
  companyId: string;
  name: string;
  updatedAt?: Date;
  createdAt?: Date;
};

export type PersistedCategory = Persisted<Category>;
