import { Product } from "@/product/types"

export const IMG_MAX_LIMIT = 5;

export const EMPTY_PRODUCT: Product = {
  name: "",
  price: 0,
  sku: "",
  stock: 0,
  photos: [],
  categories: []
}