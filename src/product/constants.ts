import { Product, SortOptions } from "@/product/types";

export const IMG_MAX_LIMIT = 5;

export const EMPTY_PRODUCT: Product = {
  name: "",
  price: 0,
  sku: "",
  purchasePrice: null,
  stock: 0,
  photos: [],
  categories: [],
};

export const sortOptions: SortOptions = {
  name_asc: { name: "Alfabéticamente", value: { name: "asc" } },
  last_units_available: {
    name: "Últimas unidades disponibles",
    value: { stock: "asc" },
  },
};
