import { createStore } from "zustand/vanilla";
import {
  type PackageProduct,
  PackageProductType,
  type Product,
  type SingleProduct,
  SingleProductType,
} from "@/product/types";

type ProductFormStateBase = {
  open: boolean;
  performingAction: boolean;
};

type SingleProductFormState = ProductFormStateBase & {
  product: SingleProduct;
  productType: typeof SingleProductType;
  isNew: false;
};

type NewSingleProductFormState = ProductFormStateBase & {
  product: null;
  productType: typeof SingleProductType;
  isNew: true;
};

type PackageProductFormState = ProductFormStateBase & {
  product: PackageProduct;
  productType: typeof PackageProductType;
  isNew: false;
};

type NewPackageProductFormState = ProductFormStateBase & {
  product: null;
  productType: typeof PackageProductType;
  isNew: true;
};

export type ProductFormState =
  | SingleProductFormState
  | NewSingleProductFormState
  | PackageProductFormState
  | NewPackageProductFormState;

export type ProductFormActions = {
  setProduct: (product: Product) => void;
  resetProduct: () => void;
  setOpen: (open: boolean) => void;
  setPerformingAction: (performingAction: boolean) => void;
};

export type ProductFormStore = ProductFormState & ProductFormActions;

export const defaultInitState: ProductFormState = {
  product: null,
  productType: SingleProductType,
  isNew: true,
  open: false,
  performingAction: false,
};

export const createProductFormStore = (
  initState: ProductFormState = { ...defaultInitState },
) => {
  return createStore<ProductFormStore>()((set) => ({
    ...initState,
    setProduct: (product) =>
      set(
        // The following line is a type assertion. We know that the product
        product.type === SingleProductType
          ? {
              product,
              isNew: false,
              open: true,
              performingAction: false,
              productType: product.type,
            }
          : {
              product,
              isNew: false,
              open: true,
              performingAction: false,
              productType: product.type,
            },
      ),
    resetProduct: () => set({ ...defaultInitState }),
    setOpen: (open) => set({ open }),
    setPerformingAction: (performingAction: boolean) =>
      set({ performingAction }),
  }));
};
