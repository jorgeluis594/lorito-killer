"use client";

import {
  type ReactNode,
  createContext,
  useRef,
  useContext,
  useEffect,
} from "react";
import { type StoreApi, useStore } from "zustand";

import {
  type ProductsStore,
  createProductsStore,
} from "@/product/components/store";
import { useToast } from "@/shared/components/ui/use-toast";
import { getMany as getManyProducts } from "@/product/api_repository";
import { Product, SingleProduct, SingleProductType } from "@/product/types";

export const ProductsStoreContext =
  createContext<StoreApi<ProductsStore> | null>(null);

export interface ProductsStoreProviderProps {
  children: ReactNode;
}

const ProductsLoader = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { isLoading, setProducts, setIsLoading } = useProductsStore(
    (store) => store,
  );

  useEffect(() => {
    if (isLoading) {
      getManyProducts().then((response) => {
        if (response.success) {
          setProducts(response.data);
        } else {
          setProducts([]);
          toast({
            description: "No se pudo obtener los productos",
          });
        }
        setIsLoading(false);
      });
    }
  }, []);

  return <>{children}</>;
};

export const ProductsStoreProvider = ({
  children,
}: ProductsStoreProviderProps) => {
  const storeRef = useRef<StoreApi<ProductsStore>>(null);
  if (!storeRef.current) {
    storeRef.current = createProductsStore();
  }

  return (
    <ProductsStoreContext.Provider value={storeRef.current}>
      <ProductsLoader>{children}</ProductsLoader>
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

export const useSingleProducts = (): SingleProduct[] => {
  const products = useProductsStore((store) => store.products);

  return products.filter(filterSingleProduct);
};

const filterSingleProduct = (product: Product): product is SingleProduct => {
  return product.type === SingleProductType;
};
