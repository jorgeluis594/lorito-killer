import { createStore } from "zustand/vanilla";
import {
  type PackageProduct,
  PackageProductType,
  type Product,
  type ProductService,
  type SingleProduct,
  SingleProductType,
  ServiceProductType,
  type DishProduct,
  DishProductType,
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

type ServiceProductFormState = ProductFormStateBase & {
  product: ProductService;
  productType: typeof ServiceProductType;
  isNew: false;
};

type NewServiceProductFormState = ProductFormStateBase & {
  product: null;
  productType: typeof ServiceProductType;
  isNew: true;
};

type DishProductFormState = ProductFormStateBase & {
  product: DishProduct;
  productType: typeof DishProductType;
  isNew: false;
};

type NewDishProductFormState = ProductFormStateBase & {
  product: null;
  productType: typeof DishProductType;
  isNew: true;
};

export type ProductFormState =
  | SingleProductFormState
  | NewSingleProductFormState
  | PackageProductFormState
  | NewPackageProductFormState
  | ServiceProductFormState
  | NewServiceProductFormState
  | DishProductFormState
  | NewDishProductFormState;

export type ProductFormActions = {
  setProduct: (product: Product) => void;
  resetProduct: (
    productType:
      | typeof SingleProductType
      | typeof PackageProductType
      | typeof ServiceProductType
      | typeof DishProductType,
  ) => void;
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
        product.type === SingleProductType
          ? {
              product,
              isNew: false,
              open: true,
              performingAction: false,
              productType: product.type,
            }
          : product.type === PackageProductType
            ? {
                product,
                isNew: false,
                open: true,
                performingAction: false,
                productType: product.type,
              }
            : product.type === ServiceProductType
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
                  productType: DishProductType,
                },
      ),
    resetProduct: (productType) =>
      set(
        productType === SingleProductType
          ? {
              product: null,
              productType: SingleProductType,
              isNew: true,
              open: false,
              performingAction: false,
            }
          : productType === PackageProductType
            ? {
                product: null,
                productType: PackageProductType,
                isNew: true,
                open: false,
                performingAction: false,
              }
            : productType === ServiceProductType
              ? {
                  product: null,
                  productType: ServiceProductType,
                  isNew: true,
                  open: false,
                  performingAction: false,
                }
              : {
                  product: null,
                  productType: DishProductType,
                  isNew: true,
                  open: false,
                  performingAction: false,
                },
      ),
    setOpen: (open) => set({ open }),
    setPerformingAction: (performingAction: boolean) =>
      set({ performingAction }),
  }));
};
