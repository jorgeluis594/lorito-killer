"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { type StoreApi, useStore } from "zustand";

import {
  type OrderFormStore,
  createOrderFormStore,
  initOrderFormStore,
  Actions,
} from "./store";
import { Product } from "@/product/types";

const OrderFormStoreContext = createContext<StoreApi<OrderFormStore> | null>(
  null,
);

interface OrderFormProviderProps {
  children: ReactNode;
}

export const OrderFormProvider = ({ children }: OrderFormProviderProps) => {
  const storeRef = useRef<StoreApi<OrderFormStore>>();
  if (!storeRef.current) {
    storeRef.current = createOrderFormStore(initOrderFormStore());
  }

  return (
    <OrderFormStoreContext.Provider value={storeRef.current}>
      {children}
    </OrderFormStoreContext.Provider>
  );
};

export const useOrderFormStore = <T,>(
  selector: (store: OrderFormStore) => T,
): T => {
  const orderFormStoreContext = useContext(OrderFormStoreContext);

  if (!orderFormStoreContext) {
    throw new Error(
      "useOrderFormStore must be used within a OrderFormProvider",
    );
  }

  return useStore(orderFormStoreContext, selector);
};

export const useOrderFormActions = (): Actions => {
  const orderFormStoreContext = useContext(OrderFormStoreContext);
  if (!orderFormStoreContext) {
    throw new Error(
      "useOrderFormStore must be used within a OrderFormProvider",
    );
  }

  return {
    addProduct: (product: Product) => {
      orderFormStoreContext.setState((state) => {
        const orderItem = state.orderItems.find(
          (item) => item.product.id === product.id,
        );

        if (orderItem) {
          orderItem.quantity += 1;
          orderItem.total = orderItem.product.price * orderItem.quantity;
          state.total += orderItem.product.price;
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
    removeOrderItem: (orderItemId: string) => {
      orderFormStoreContext.setState((state) => {
        const orderItem = state.orderItems.find(
          (item) => item.id === orderItemId,
        );

        if (orderItem) {
          state.total -= orderItem.total;
          state.orderItems = state.orderItems.filter(
            (item) => item.id !== orderItemId,
          );
        }

        return { ...state, orderItems: [...state.orderItems] };
      });
    },
    reset: () => {
      const order = initOrderFormStore();
      orderFormStoreContext.setState({
        ...initOrderFormStore(),
        orderItems: [],
      });
    },
    increaseQuantity: (orderItemId: string) => {
      orderFormStoreContext.setState((state) => {
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
      orderFormStoreContext.setState((state) => {
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
  };
};
