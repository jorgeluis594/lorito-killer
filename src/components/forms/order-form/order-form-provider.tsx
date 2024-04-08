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
import { Payment, PaymentMethod } from "@/order/types";

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

  const updateTotal = () => {
    const { order } = orderFormStoreContext.getState();
    order.total = order.orderItems.reduce((acc, item) => acc + item.total, 0);
    orderFormStoreContext.setState(() => {
      return { order: { ...order, total: order.total } };
    });
  };

  const getPayment = (paymentMethod: PaymentMethod): Payment | undefined => {
    const { order } = orderFormStoreContext.getState();
    return order.payments.find((payment) => payment.method === paymentMethod);
  };

  const removePayment = (paymentMethod: PaymentMethod) => {
    const { order } = orderFormStoreContext.getState();
    order.payments = order.payments.filter(
      (payment) => payment.method !== paymentMethod,
    );
    orderFormStoreContext.setState({
      order: { ...order, payments: [...order.payments] },
    });
  };

  const addProduct = (product: Product) => {
    const { order } = orderFormStoreContext.getState();

    const orderItem = order.orderItems.find(
      (item) => item.product.id === product.id,
    );

    if (orderItem) {
      increaseQuantity(orderItem.id!);
    } else {
      order.orderItems.push({
        product,
        id: crypto.randomUUID(),
        quantity: 1,
        total: product.price,
      });

      orderFormStoreContext.setState(() => {
        return { order: { ...order, orderItems: [...order.orderItems] } };
      });
      updateTotal();
    }
  };

  const removeOrderItem = (orderItemId: string) => {
    const { order } = orderFormStoreContext.getState();
    order.orderItems = order.orderItems.filter(
      (item) => item.id !== orderItemId,
    );

    orderFormStoreContext.setState(() => {
      return { order: { ...order, orderItems: [...order.orderItems] } };
    });

    updateTotal();
  };

  const increaseQuantity = (orderItemId: string) => {
    const { order } = orderFormStoreContext.getState();
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
      orderFormStoreContext.setState(() => {
        return { order: { ...order, orderItems: [...order.orderItems] } };
      });

      updateTotal();
    }
  };

  const decreaseQuantity = (orderItemId: string) => {
    const { order } = orderFormStoreContext.getState();
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
      removeOrderItem(orderItemId);
    } else {
      orderItem.quantity--;
      orderItem.total = orderItem.product.price * orderItem.quantity;
      orderFormStoreContext.setState(() => {
        return { order: { ...order, orderItems: [...order.orderItems] } };
      });

      updateTotal();
    }
  };

  const getPaidAmount = (): number => {
    const { order } = orderFormStoreContext.getState();
    return (order.payments || []).reduce(
      (acc, payment) => acc + payment.amount,
      0,
    );
  };

  return {
    addProduct,
    removeOrderItem,
    resetPayment: () => {
      const { order } = orderFormStoreContext.getState();
      orderFormStoreContext.setState({
        order: { ...order, payments: [] },
        paymentMode: "none",
      });
    },
    reset: () => {
      const order = initOrderFormStore();
      orderFormStoreContext.setState({
        ...initOrderFormStore(),
      });
    },
    increaseQuantity,
    decreaseQuantity,
    setPaymentMode: (mode: OrderFormStore["paymentMode"]) => {
      orderFormStoreContext.setState({ paymentMode: mode });
    },
    getPaidAmount,
    addPayment: (payment) => {
      const { order } = orderFormStoreContext.getState();
      if (payment.amount > order.total - getPaidAmount()) {
        return {
          success: false,
          message: "El monto pagado es mayor que el a pagar",
        };
      }

      if (getPayment(payment.method)) {
        removePayment(payment.method);
      }

      orderFormStoreContext.setState({
        order: {
          ...order,
          payments: [...order.payments, payment],
        },
      });

      return { success: true, data: { ...payment } };
    },
    removePayment,
    removeAllPayments: () => {
      const { order } = orderFormStoreContext.getState();

      orderFormStoreContext.setState({
        order: { ...order, payments: [] },
      });
    },
  };
};
