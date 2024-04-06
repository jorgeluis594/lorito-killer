"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { type StoreApi, useStore } from "zustand";

import {
  type CategoryStore,
  createCategoryStore,
} from "@/category/components/store";
import { type Category } from "@/category/types";

export const CategoryStoreContext =
  createContext<StoreApi<CategoryStore> | null>(null);

export interface CounterStoreProviderProps {
  children: ReactNode;
  initialCategories: Category[];
}

export const CategoryStoreProvider = ({
  children,
  initialCategories,
}: CounterStoreProviderProps) => {
  const storeRef = useRef<StoreApi<CategoryStore>>();
  if (!storeRef.current) {
    storeRef.current = createCategoryStore({ categories: initialCategories });
  }

  return (
    <CategoryStoreContext.Provider value={storeRef.current}>
      {children}
    </CategoryStoreContext.Provider>
  );
};

export const useCategoryStore = <T,>(
  selector: (store: CategoryStore) => T,
): T => {
  const categoryStoreContext = useContext(CategoryStoreContext);

  if (!categoryStoreContext) {
    throw new Error(
      `useCategoryStore must be use within CategoryStoreProvider`,
    );
  }

  return useStore(categoryStoreContext, selector);
};
