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

type ProductBase = {
  id?: string;
  companyId: string;
  name: string;
  price: number;
  sku?: string;
  description: string;
  photos?: Photo[];
  categories: Category[];
  updatedAt?: Date;
  createdAt?: Date;
};

export const SingleProductType = "SingleProduct";

export type SingleProduct = ProductBase & {
  purchasePrice?: number;
  type: typeof SingleProductType;
  stock: number;
};

export const PackageProductType = "PackageProduct";
export type PackageProduct = ProductBase & {
  type: typeof PackageProductType;
  productItems: ProductItem[];
};

export type Product = SingleProduct | PackageProduct;

export type ProductItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
};

export type ProductSearchParams = {
  sku?: string;
  companyId?: string;
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
