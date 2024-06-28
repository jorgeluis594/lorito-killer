import { createStore } from "zustand/vanilla";

import { Category } from "@/category/types";

export type CategoryState = {
  categories: Category[];
  isLoading: boolean;
  open: boolean;
  performingAction: boolean
};

export type CategoryActions = {
  setCategories: (categories: Category[]) => void;
  updateCategory: (category: Category) => void;
  setIsLoading: (isLoading: boolean) => void;
  setOpen: (open: boolean) => void;
  setPerformingAction: (performingAction: boolean) => void;
  deleteCategory: (categoryId: string) => void;
};

export type CategoryStore = CategoryState & CategoryActions;

export const defaultInitState: CategoryState = {
  categories: [],
  isLoading: false,
  open: false,
  performingAction: false,
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
  open: false,
  performingAction: false,
});

export const createCategoryStore = (
  initState: CategoryState = defaultInitState,
) => {
  return createStore<CategoryStore>()((set) => ({
    ...initState,
    categories: sortCategories(initState.categories),
    deleteCategory: (categoryId) => set(state => ({categories: state.categories.filter(c => c.id !== categoryId)})),
    updateCategory: (category: Category) => set(state => ({ categories: state.categories.map(c => c.id === category.id ? category : c) })),
    setCategories: (categories: Category[]) =>
      set({ categories: [...sortCategories(categories)] }),
    setIsLoading: (isLoading: boolean) => set({ isLoading }),
    setOpen: (open) => set({ open }),
    setPerformingAction: (performingAction: boolean) =>
      set({ performingAction }),
  }));
};
