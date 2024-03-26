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

export const initOrderFormStore = (): Order => {
  return {
    orderItems: [],
    total: 0,
  };
};

export const createOrderFormStore = (initState: Order = defaultInitState) => {
  return createStore<OrderFormStore>()((set) => ({
    ...initState,
    addProduct: (product: Product) => {
      set((state) => {
        const orderItem = state.orderItems.find(
          (item) => item.product.id === product.id,
        );

        if (orderItem) {
          orderItem.quantity += 1;
        } else {
          state.orderItems.push({
            product,
            id: crypto.randomUUID(),
            quantity: 1,
          });
        }
        state.total += product.price;

        return { ...state, orderItems: [...state.orderItems] };
      });
    },
    increaseQuantity: (productId: string) => {},
    decreaseQuantity: (productId: string) => {},
  }));
};
