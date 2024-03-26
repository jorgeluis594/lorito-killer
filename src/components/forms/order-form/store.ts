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
            total: product.price,
          });
        }
        state.total += product.price;

        return { ...state, orderItems: [...state.orderItems] };
      });
    },
    increaseQuantity: (orderItemId: string) => {
      set((state) => {
        const orderItem = state.orderItems.find(
          (item) => item.id === orderItemId,
        );

        if (!orderItem) {
          console.error("Order item not found");
        } else if (orderItem.quantity >= orderItem.product.stock) {
          console.error("Product stock exceeded");
        } else {
          orderItem.quantity += 1;
          orderItem.total = orderItem.product.price * orderItem.quantity;
          state.total += orderItem.product.price;
        }

        return { ...state, orderItems: [...state.orderItems] };
      });
    },
    decreaseQuantity: (orderItemId: string) => {
      set((state) => {
        const orderItem = state.orderItems.find(
          (item) => item.id === orderItemId,
        );

        if (!orderItem) {
          console.error("Order item not found");
        } else if (orderItem.quantity <= 0) {
          console.error("Product quantity can't be less than 1");
        } else if (orderItem.quantity == 1) {
          state.orderItems = state.orderItems.filter(
            (item) => item.id !== orderItemId,
          );
          state.total -= orderItem.product.price;
        } else {
          orderItem.quantity -= 1;
          orderItem.total = orderItem.product.price * orderItem.quantity;
          state.total -= orderItem.product.price;
        }

        return { ...state, orderItems: [...state.orderItems] };
      });
    },
  }));
};
