import { Category } from "@/category/types";

export type Photo = {
  id?: string;
  name: string;
  size: number;
  type: string;
  key: string;
  url: string;
  createdAt?: Date;
};

export type Product = {
  id?: string;
  name: string;
  price: number;
  sku: string;
  stock: number;
  purchasePrice?: number;
  description: string;
  photos?: Photo[];
  categories: Category[];
  updatedAt?: Date;
  createdAt?: Date;
};

export type ProductSearchParams = {
  sku?: string;
  categories?: { id?: string };
};

export type ProductSortParams = {
  [P in keyof Omit<Product, "id" | "photos" | "categories">]?: "asc" | "desc";
};

export type SortOptions = {
  [key in "name_asc" | "last_units_available" | "created_desc"]?: {
    name: string;
    value: ProductSortParams;
  };
};

export type SortKey = keyof SortOptions;
