import { createStore } from "zustand/vanilla";

import { Order } from "@/order/types";
import { Product } from "@/product/types";

export type Actions = {
  addProduct: (product: Product) => void;
  removeOrderItem: (orderItemId: string) => void;
  reset: () => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
};

export type OrderFormStore = { order: Order };

const defaultInitState: OrderFormStore = {
  order: {
    orderItems: [],
    payments: [],
    status: "pending",
    total: 0,
  },
};

export const initOrderFormStore = (): OrderFormStore => {
  return {
    ...defaultInitState,
    order: { ...defaultInitState.order, orderItems: [] },
  };
};

// The actions are set on the context provider
export const createOrderFormStore = (
  initState: OrderFormStore = defaultInitState,
) => {
  return createStore<OrderFormStore>()(() => ({
    ...initState,
  }));
};
