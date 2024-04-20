"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { type StoreApi, useStore } from "zustand";

import {
  type ProductFormStore,
  createProductFormStore,
} from "@/product/components/form/store";

export const ProductFormStoreContext =
  createContext<StoreApi<ProductFormStore> | null>(null);

export interface ProductFormStoreProvider {
  children: ReactNode;
}

export const ProductFormStoreProvider = ({
  children,
}: ProductFormStoreProvider) => {
  const storeRef = useRef<StoreApi<ProductFormStore>>();
  if (!storeRef.current) {
    storeRef.current = createProductFormStore();
  }

  return (
    <ProductFormStoreContext.Provider value={storeRef.current}>
      {children}
    </ProductFormStoreContext.Provider>
  );
};

export const useProductFormStore = <T,>(
  selector: (store: ProductFormStore) => T,
): T => {
  const productFormStoreContext = useContext(ProductFormStoreContext);

  if (!productFormStoreContext) {
    throw new Error(
      `useProductFormStore must be use within ProductFormStoreProvider`,
    );
  }

  return useStore(productFormStoreContext, selector);
};
