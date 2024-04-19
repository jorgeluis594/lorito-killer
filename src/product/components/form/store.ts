import { createStore } from "zustand/vanilla";
import { Product } from "@/product/types";

export type ProductFormState =
  | {
      product: Product;
      isNew: false;
      open: boolean;
    }
  | {
      product: null;
      isNew: true;
      open: boolean;
    };

export type ProductFormActions = {
  setProduct: (product: Product) => void;
  resetProduct: () => void;
  setOpen: (open: boolean) => void;
};

export type ProductFormStore = ProductFormState & ProductFormActions;

export const defaultInitState: ProductFormState = {
  product: null,
  isNew: true,
  open: false,
};

export const createProductFormStore = (
  initState: ProductFormState = { ...defaultInitState },
) => {
  return createStore<ProductFormStore>()((set) => ({
    ...initState,
    setProduct: (product) => set({ product, isNew: false, open: true }),
    resetProduct: () => set({ ...defaultInitState }),
    setOpen: (open) => set({ open }),
  }));
};
