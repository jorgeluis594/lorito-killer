import { createStore } from "zustand/vanilla";

import { Category } from "@/category/types";

export type CategoryState = {
  categories: Category[];
};

export type CategoryActions = {
  setCategories: (categories: Category[]) => void;
};

export type CategoryStore = CategoryState & CategoryActions;

export const defaultInitState: CategoryState = {
  categories: [],
};

export const createCategoryStore = (
  initState: CategoryState = defaultInitState,
) => {
  return createStore<CategoryStore>()((set) => ({
    ...initState,
    setCategories: (categories: Category[]) =>
      set({ categories: [...categories] }),
  }));
};
