"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { type StoreApi, useStore } from "zustand";

import {
  type CategoryStore,
  createCategoryStore,
} from "@/category/components/store";
import { getMany as getManyCategories } from "@/category/api_repository";
import { useToast } from "@/components/ui/use-toast";

export const CategoryStoreContext =
  createContext<StoreApi<CategoryStore> | null>(null);

export interface CounterStoreProviderProps {
  children: ReactNode;
}

export const CategoryStoreProvider = async ({
  children,
}: CounterStoreProviderProps) => {
  const { toast } = useToast();

  const storeRef = useRef<StoreApi<CategoryStore>>();
  if (!storeRef.current) {
    const categoriesResponse = await getManyCategories();
    if (!categoriesResponse.success) {
      toast({
        title: "Error",
        description: "Error al obtener categorías",
        variant: "destructive",
      });
      storeRef.current = createCategoryStore({ categories: [] });
    } else {
      storeRef.current = createCategoryStore({
        categories: categoriesResponse.data,
      });
    }
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
