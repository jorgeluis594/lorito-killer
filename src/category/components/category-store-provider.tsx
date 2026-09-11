"use client";

import { type ReactNode, createContext, useState, useContext } from "react";
import { type StoreApi, useStore } from "zustand";

import {
  type CategoryStore,
  createCategoryStore,
  iniCategoriesParams,
} from "@/category/components/store";

export const CategoryStoreContext =
  createContext<StoreApi<CategoryStore> | null>(null);

export interface CategoryStoreProviderProps {
  children: ReactNode;
}

export const CategoryStoreProvider = ({
  children,
}: CategoryStoreProviderProps) => {
  const [store] = useState(() =>
    createCategoryStore(iniCategoriesParams()),
  );

  return (
    <CategoryStoreContext.Provider value={store}>
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
