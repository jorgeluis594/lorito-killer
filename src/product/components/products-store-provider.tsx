"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { type StoreApi, useStore } from "zustand";

import {
  type ProductsStore,
  createProductsStore,
} from "@/product/components/store";

export const ProductsStoreContext =
  createContext<StoreApi<ProductsStore> | null>(null);

export interface ProductsStoreProviderProps {
  children: ReactNode;
}

export const ProductsStoreProvider = ({
  children,
}: ProductsStoreProviderProps) => {
  const storeRef = useRef<StoreApi<ProductsStore>>();
  if (!storeRef.current) {
    storeRef.current = createProductsStore();
  }

  return (
    <ProductsStoreContext.Provider value={storeRef.current}>
      {children}
    </ProductsStoreContext.Provider>
  );
};

export const useProductsStore = <T,>(
  selector: (store: ProductsStore) => T,
): T => {
  const productsStoreContext = useContext(ProductsStoreContext);

  if (!productsStoreContext) {
    throw new Error(`useProductStore must be use within ProductsStoreProvider`);
  }

  return useStore(productsStoreContext, selector);
};
