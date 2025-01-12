"use client";

import {createContext, type ReactNode, useContext, useRef} from "react";
import {StoreApi, useStore} from "zustand";
import {
  Actions,
  createProductFormStore,
  initProductFormStore, ProductFormStore
} from "@/new-order/components/products-view/store-products-searcher";
import {Product} from "@/product/types";
import {log} from "@/lib/log";

const ProductFormStoreContext = createContext<StoreApi<ProductFormStore> | null>(
  null,
);

interface ProductFormProviderProps {
  children: ReactNode;
}

export const ProductFormProvider = ({ children }: ProductFormProviderProps) => {
  const storeRef = useRef<StoreApi<ProductFormStore>>();
  if (!storeRef.current) {
    storeRef.current = createProductFormStore(initProductFormStore());
  }

  return (
    <ProductFormStoreContext.Provider value={storeRef.current}>
      {children}
    </ProductFormStoreContext.Provider>
  );
};

export const useProductFormStore = <T,>(
  selector: (store: ProductFormStore) => T,
): T => {
  const productFormStoreContext = useContext(ProductFormStoreContext);

  if (!productFormStoreContext) {
    throw new Error(
      "useOrderFormStore must be used within a ProductFormProvider",
    );
  }

  return useStore(productFormStoreContext, selector);
};

export const useProductFormActions = (): Actions => {

  const productFormStoreContext = useContext(ProductFormStoreContext);
  if (!productFormStoreContext) {
    throw new Error(
      "useOrderFormStore must be used within a OrderFormProvider",
    );
  }

  const setProducts = (productsStore: Product[]) => {
    productFormStoreContext.setState(() => {
      return { products: productsStore };
    });
  };

  const increaseQuantityProduct = (productId: string) => {
    const { products } = productFormStoreContext.getState();
    const product = products.find((product) => product.id === productId);
      console.log(productId)
    if (!product) {
      console.error("Product item not found");
      return;
    }

    if(product?.type === "SingleProduct"){
      product.stock+= 1;
      productFormStoreContext.setState(() => {
        return { products: products.map(p => p.id === productId ? product : p) };
      });
    }
  }

  const decreaseQuantityProduct = (productId: string) => {
    const { products } = productFormStoreContext.getState();
    const product = products.find((product) => product.id === productId);
    if (!product) {
      console.error("Product item not found");
      return;
    }

    if(product?.type === "SingleProduct"){
      if(product.stock >= 1)product.stock--
      productFormStoreContext.setState(() => {
        return { products: products.map(p => p.id === productId ? product : p) };
      });
    }
  }
  
  const restoreStockProduct = (productId: string, quantity: number) => {
    const { products } = productFormStoreContext.getState();
    const product = products.find((product) => product.id === productId);
    if (!product) {
      log.error("product_item_not_found", {productId, quantity, product});
      return;
    }

    if(product?.type === "SingleProduct"){
      product.stock += quantity;
      productFormStoreContext.setState(() => {
        return { products: products.map(p => p.id === productId ? product : p) };
      });
    }
  }

  return {
    setProducts,
    decreaseQuantityProduct,
    increaseQuantityProduct,
    restoreStockProduct,
  }
}