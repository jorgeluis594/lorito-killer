import { createStore } from "zustand/vanilla";
import { Product } from "@/product/types";

export type ProductsState = {
  products: Product[];
  isLoading: boolean;
};

export type ProductsActions = {
  setProducts: (products: Product[]) => void;
  setIsLoading: (isLoading: boolean) => void;
};

export type ProductsStore = ProductsState & ProductsActions;

export const defaultInitState: ProductsState = {
  products: [],
  isLoading: true,
};

export const createProductsStore = (
  initState: ProductsState = defaultInitState,
) => {
  return createStore<ProductsStore>()((set) => ({
    ...initState,
    setProducts: (products) => set((state) => ({ products })),
    setIsLoading: (loading) => set((state) => ({ isLoading: loading })),
  }));
};
