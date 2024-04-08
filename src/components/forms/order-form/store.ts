import { createStore } from "zustand/vanilla";

import { Order, Payment, PaymentMethod } from "@/order/types";
import { Product } from "@/product/types";
import { response } from "@/lib/types";

export type OrderFormStore = {
  order: Order;
  paymentMode: "card" | "wallet" | "cash" | "none" | "combine";
};

export type Actions = {
  addProduct: (product: Product) => void;
  removeOrderItem: (orderItemId: string) => void;
  reset: () => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  setPaymentMode: (mode: OrderFormStore["paymentMode"]) => void;
  addPayment: (payment: Payment) => response<Payment>;
  getPaidAmount: () => number;
  removePayment: (paymentMethod: PaymentMethod) => void;
  removeAllPayments: () => void;
  resetPayment: () => void;
};

const defaultInitState: OrderFormStore = {
  order: {
    orderItems: [],
    payments: [],
    status: "pending",
    total: 0,
  },
  paymentMode: "none",
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
