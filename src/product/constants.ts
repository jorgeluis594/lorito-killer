import { Product, SortOptions } from "@/product/types";

export const IMG_MAX_LIMIT = 1;

export const EMPTY_PRODUCT = {
  companyId: "",
  name: "",
  price: 0,
  purchasePrice: 0,
  description: "",
  stock: undefined,
  photos: [],
  categories: [],
} as Omit<Product, "stock">;

export const sortOptions: SortOptions = {
  name_asc: { name: "Alfabéticamente", value: { name: "asc" } },
  last_units_available: {
    name: "Últimas unidades disponibles",
    value: { stock: "asc" },
  },
};
