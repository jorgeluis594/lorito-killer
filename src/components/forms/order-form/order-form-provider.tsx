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

  const addProduct = (product: Product) => {
    const order = orderFormStoreContext.getState();

    const orderItem = order.orderItems.find(
      (item) => item.product.id === product.id,
    );

    if (orderItem) {
      increaseQuantity(orderItem.id!);
      return;
    } else {
      order.orderItems.push({
        product,
        id: crypto.randomUUID(),
        quantity: 1,
        total: product.price,
      });

      orderFormStoreContext.setState((state) => {
        return {
          orderItems: [...order.orderItems],
        };
      });
    }
  };

  const increaseQuantity = (orderItemId: string) => {
    const order = orderFormStoreContext.getState();
    const orderItem = order.orderItems.find((item) => item.id === orderItemId);

    if (!orderItem) {
      console.error("Order item not found");
      return;
    } else if (orderItem.quantity >= orderItem.product.stock) {
      console.error("Product stock exceeded");
      return;
    } else {
      orderItem.quantity += 1;
      orderItem.total = orderItem.product.price * orderItem.quantity;
    }

    orderFormStoreContext.setState(() => {
      return { orderItems: [...order.orderItems] };
    });
  };

  const decreaseQuantity = (orderItemId: string) => {
    const order = orderFormStoreContext.getState();
    const orderItem = order.orderItems.find((item) => item.id === orderItemId);

    if (!orderItem) {
      console.error("Order item not found");
      return;
    }

    if (orderItem.quantity <= 0) {
      console.error("Product quantity can't be less than 1");
      return;
    }

    if (orderItem.quantity == 1) {
      order.orderItems = order.orderItems.filter(
        (item) => item.id !== orderItemId,
      );
      order.total -= orderItem.product.price;
    } else {
      orderItem.quantity--;
      orderItem.total = orderItem.product.price * orderItem.quantity;
    }

    orderFormStoreContext.setState(() => {
      return { orderItems: [...order.orderItems] };
    });
  };

  return {
    addProduct,
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
    increaseQuantity,
    decreaseQuantity,
  };
};
