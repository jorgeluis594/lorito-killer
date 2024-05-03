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
import { useToast } from "@/shared/components/ui/use-toast";
import { findProduct } from "@/product/api_repository";

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
  const { toast } = useToast();

  const orderFormStoreContext = useContext(OrderFormStoreContext);
  if (!orderFormStoreContext) {
    throw new Error(
      "useOrderFormStore must be used within a OrderFormProvider",
    );
  }

  const stockChecker = (orderItemId: string) => {
    const { order } = orderFormStoreContext.getState();
    const orderItem = order.orderItems.find((item) => item.id === orderItemId);

    if (!orderItem) {
      console.error("Order item not found");
      return;
    }

    findProduct(orderItem.productId).then((response) => {
      if (!response.success) {
        return;
      }

      if (response.data.stock === 0) {
        toast({
          description: `Producto ${response.data.name} sin stock`,
          variant: "destructive",
        });
        removeOrderItem(orderItemId);
        return;
      }

      if (response.data.stock < orderItem.quantity) {
        toast({
          description:
            `No hay suficiente stock de ${response.data.name}, stock disponible: ` +
            response.data.stock,
          variant: "destructive",
        });
        orderItem.quantity = response.data.stock;
        orderItem.total = orderItem.productPrice * orderItem.quantity;

        orderFormStoreContext.setState({
          order: { ...order, orderItems: [...order.orderItems] },
        });

        updateTotal();
      }
    });
  };

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
      (item) => item.productId === product.id,
    );

    if (orderItem) {
      increaseQuantity(orderItem.id!);
    } else {
      const orderItemId = crypto.randomUUID();
      const oi = {
        id: orderItemId,
        productId: product.id!,
        productName: product.name,
        productPrice: product.price,
        quantity: 1,
        total: product.price,
      };

      order.orderItems.push(oi);

      orderFormStoreContext.setState(() => {
        return { order: { ...order, orderItems: [...order.orderItems] } };
      });
      updateTotal();
      stockChecker(orderItemId);
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
    }

    orderItem.quantity += 1;
    orderItem.total = orderItem.productPrice * orderItem.quantity;
    orderFormStoreContext.setState(() => {
      return { order: { ...order, orderItems: [...order.orderItems] } };
    });

    updateTotal();
    stockChecker(orderItemId);
  };

  const decreaseQuantity = (orderItemId: string) => {
    const { order } = orderFormStoreContext.getState();
    const orderItem = order.orderItems.find((item) => item.id === orderItemId);

    if (!orderItem) {
      console.error("Order item not found");
      return;
    }

    if (orderItem.quantity <= 0) {
      toast({
        description: "La cantidad no puede ser menor a 0",
        variant: "destructive",
      });
      removeOrderItem(orderItemId);
      return;
    }

    if (orderItem.quantity == 1) {
      removeOrderItem(orderItemId);
    } else {
      orderItem.quantity--;
      orderItem.total = orderItem.productPrice * orderItem.quantity;
      orderFormStoreContext.setState(() => {
        return { order: { ...order, orderItems: [...order.orderItems] } };
      });

      updateTotal();
      stockChecker(orderItemId);
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
      const {
        order: { cashShiftId, companyId },
      } = orderFormStoreContext.getState();
      const { order, ...rest } = initOrderFormStore();
      orderFormStoreContext.setState({
        ...rest,
        order: { ...order, cashShiftId: cashShiftId, companyId: companyId },
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
      if (getPayment(payment.method)) {
        removePayment(payment.method);
        order.payments = order.payments.filter(
          (storedPayment) => storedPayment.method !== payment.method,
        );
      }

      if (payment.amount > order.total - getPaidAmount()) {
        return {
          success: false,
          message: "El monto pagado es mayor que el a pagar",
        };
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
    setCashShift: (cashShift) => {
      const { order } = orderFormStoreContext.getState();
      orderFormStoreContext.setState({
        order: {
          ...order,
          cashShiftId: cashShift.id,
          companyId: cashShift.companyId,
        },
      });
    },
  };
};
