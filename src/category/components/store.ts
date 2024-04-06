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

function sortCategories(categories: Category[]) {
  return categories.sort((a, b) => {
    if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
    if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
    return 0;
  });
}

export const createCategoryStore = (
  initState: CategoryState = defaultInitState,
) => {
  return createStore<CategoryStore>()((set) => ({
    ...initState,
    categories: sortCategories(initState.categories),
    setCategories: (categories: Category[]) =>
      set({ categories: [...sortCategories(categories)] }),
  }));
};
