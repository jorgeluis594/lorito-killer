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
  photos?: Photo[];
  categories: Category[];
  updatedAt?: Date;
  createdAt?: Date;
};

export type ProductSearchParams = {
  sku?: string;
};

export type ProductSortParams = {
  [P in keyof Omit<Product, "id" | "photos" | "categories">]?: "asc" | "desc";
};
