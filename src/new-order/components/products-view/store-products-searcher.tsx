import {Product} from "@/product/types";
import {createStore} from "zustand/vanilla";


export type ProductFormStore = {
  products: Product[];
}

export type Actions = {
  setProducts: (products: Product[]) => void;
  increaseQuantityProduct: (productId: string) => void;
  decreaseQuantityProduct: (productId: string) => void;
  restoreStockProduct: (productId: string, quantity: number) => void;
}

const defaultInitState: ProductFormStore = {
  products: [],
}

export const initProductFormStore = (): ProductFormStore => {
  return {
    ...defaultInitState,
    products: { ...defaultInitState.products},
  };
};

// The actions are set on the context provider
export const createProductFormStore = (
  initState: ProductFormStore = defaultInitState,
) => {
  return createStore<ProductFormStore>()(() => ({
    ...initState,
  }));
};