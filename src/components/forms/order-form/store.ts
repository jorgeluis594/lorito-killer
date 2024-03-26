import { createStore } from "zustand/vanilla";

import { Order } from "@/order/types";
import { Product } from "@/product/types";

type Actions = {
  addProduct: (product: Product) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
};

export type OrderFormStore = Order & Actions;

const defaultInitState: Order = {
  orderItems: [],
  total: 0,
};

export const createOrderFormStore = (initState: Order = defaultInitState) => {
  return createStore<OrderFormStore>()((set) => ({
    ...initState,
    addProduct: (product: Product) => {},
    increaseQuantity: (productId: string) => {},
    decreaseQuantity: (productId: string) => {},
  }));
};
