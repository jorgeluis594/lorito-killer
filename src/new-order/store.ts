import { createStore } from "zustand/vanilla";

import {Discount, Order, OrderItem, Payment, PaymentMethod} from "@/order/types";
import { Product } from "@/product/types";
import { response } from "@/lib/types";
import { CashShift } from "@/cash-shift/types";
import { Customer } from "@/customer/types";
import { DocumentType } from "@/document/types";

export type OrderFormStore = {
  order: Order;
  paymentMode: "card" | "wallet" | "cash" | "none" | "combine";
};

export type Actions = {
  addProduct: (product: Product, stock?: number) => void;
  setDocumentType: (documentType: DocumentType) => void;
  setDiscount: (discount?: Discount) => void;
  setCustomer: (customer: Customer) => void;
  removeCustomer: () => void;
  getOrderItemByProduct: (productId: string) => OrderItem | undefined;
  removeOrderItem: (orderItemId: string) => void;
  addOrderItem: (orderItem: OrderItem) => void;
  updateOrderItem: (orderItem: OrderItem) => void;
  reset: () => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  setPaymentMode: (mode: OrderFormStore["paymentMode"]) => void;
  addPayment: (payment: Payment) => response<Payment>;
  getPaidAmount: () => number;
  removePayment: (paymentMethod: PaymentMethod) => void;
  removeAllPayments: () => void;
  resetPayment: () => void;
  /**
   * Sets the cash shift and company ID in the order form.
   *
   * This method is responsible for updating the cash shift ID and company ID in the order form.
   * It retrieves the current state of the order form, and then updates the `cashShiftId` and `companyId` fields
   * with the corresponding values from the provided cash shift object.
   *
   * Note: This method currently also sets the `companyId` in the order form, which may not be its responsibility.
   * This aspect of the method's functionality may need to be refactored in the future.
   * To see the implementation of set companyId in the order form, see the `setCompanyId` method in the `order-form-provider.tsx` file.
   *
   * @param {CashShift} cashShift - The cash shift object containing the new cash shift ID and company ID.
   */
  setCashShift: (cashShift: CashShift) => void;
};

const defaultInitState: OrderFormStore = {
  order: {
    cashShiftId: "",
    customerId: undefined,
    companyId: "",
    orderItems: [],
    payments: [],
    status: "pending",
    documentType: "ticket",
    discount: undefined,
    netTotal: 0,
    discountAmount: 0,
    total: 0,
    customer: undefined,
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
