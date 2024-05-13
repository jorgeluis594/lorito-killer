import {
  PackageProduct,
  PackageProductType,
  SingleProduct,
  SingleProductType,
  SortOptions,
} from "@/product/types";

export const IMG_MAX_LIMIT = 1;

export const EMPTY_SINGLE_PRODUCT: Omit<SingleProduct, "stock"> = {
  companyId: "",
  type: SingleProductType,
  name: "",
  price: 0,
  description: "",
  photos: [],
  categories: [],
};

export const EMPTY_PACKAGE_PRODUCT: PackageProduct = {
  companyId: "",
  type: PackageProductType,
  name: "",
  price: 0,
  description: "",
  photos: [],
  categories: [],
  productItems: [],
};

export const sortOptions: SortOptions = {
  name_asc: { name: "Alfabéticamente", value: { name: "asc" } },
  last_units_available: {
    name: "Últimas unidades disponibles",
    value: { stock: "asc" },
  },
};
