import { createStore } from "zustand/vanilla";
import { Product } from "@/product/types";

export type ProductsState = {
  products: Product[];
  isLoading: boolean;
};

export type ProductsActions = {
  setProducts: (products: Product[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
};

export type ProductsStore = ProductsState & ProductsActions;

export const defaultInitState: ProductsState = {
  products: [],
  isLoading: true,
};

function sortProducts(products: Product[]) {
  return products.sort((a, b) => {
    if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
    if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
    return 0;
  });
}

export const createProductsStore = (
  initState: ProductsState = defaultInitState,
) => {
  return createStore<ProductsStore>()((set, getState) => {
    const setProducts = (products: Product[]) => {
      set((state) => ({ products: sortProducts(products) }));
    };

    return {
      ...initState,
      setProducts,
      deleteProduct: (productId: string) => {
        setProducts(getState().products.filter(p => p.id !== productId));
      },
      setIsLoading: (loading) => set((state) => ({ isLoading: loading })),
      addProduct: (product) => setProducts([...getState().products, product]),
      updateProduct: (product) =>
        setProducts(
          getState().products.map((p) => (p.id === product.id ? product : p)),
        ),
    };
  });
};
