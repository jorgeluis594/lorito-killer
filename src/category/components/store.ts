import { createStore } from "zustand/vanilla";

import { Category } from "@/category/types";

export type CategoryState = {
  categories: Category[];
  isLoading: boolean;
};

export type CategoryActions = {
  setCategories: (categories: Category[]) => void;
  setIsLoading: (isLoading: boolean) => void;
};

export type CategoryStore = CategoryState & CategoryActions;

export const defaultInitState: CategoryState = {
  categories: [],
  isLoading: false,
};

function sortCategories(categories: Category[]) {
  return categories.sort((a, b) => {
    if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
    if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
    return 0;
  });
}

export const iniCategoriesParams = (): CategoryState => ({
  categories: [],
  isLoading: false,
});

export const createCategoryStore = (
  initState: CategoryState = defaultInitState,
) => {
  return createStore<CategoryStore>()((set) => ({
    ...initState,
    categories: sortCategories(initState.categories),
    setCategories: (categories: Category[]) =>
      set({ categories: [...sortCategories(categories)] }),
    setIsLoading: (isLoading: boolean) => set({ isLoading }),
  }));
};
