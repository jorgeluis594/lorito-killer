"use client";

import {
  type ReactNode,
  createContext,
  useState,
  useContext,
  useEffect,
} from "react";
import { useToast } from "@/shared/components/ui/use-toast";
import { type StoreApi, useStore } from "zustand";

import {
  type CashShiftStore,
  createCashShiftStore,
  defaultInitState,
} from "@/cash-shift/components/store";
import { getLastOpenCashShift } from "@/cash-shift/api_repository";
import { useOrderFormActions } from "@/new-order/order-form-provider";
import useSignOut from "@/lib/use-sign-out";

export const CashShiftStoreContext =
  createContext<StoreApi<CashShiftStore> | null>(null);

export interface CashShiftStoreProviderProps {
  children: ReactNode;
}

const CashShiftLoader = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { isLoading, setCashShift } = useCashShiftStore((store) => store);
  const { setCashShift: setCashShiftToOrder } = useOrderFormActions();
  const signOut = useSignOut();

  useEffect(() => {
    if (isLoading) {
      getLastOpenCashShift().then((response) => {
        if (response.success) {
          const sortedOrders = response.data.orders.sort(
            (a, b) => b.createdAt!.getTime() - a.createdAt!.getTime(),
          );
          setCashShift({ ...response.data, orders: sortedOrders });
          setCashShiftToOrder(response.data);
        } else {
          if (response.type === "AuthError") {
            signOut();
            return;
          }
          setCashShift(null);
          toast({
            description:
              "No tienes una caja abierta, abre una para generar ventas",
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};

export const CashShiftStoreProvider = ({
  children,
}: CashShiftStoreProviderProps) => {
  const [store] = useState(() =>
    createCashShiftStore({ ...defaultInitState }),
  );

  return (
    <CashShiftStoreContext.Provider value={store}>
      <CashShiftLoader>{children}</CashShiftLoader>
    </CashShiftStoreContext.Provider>
  );
};

export const useCashShiftStore = <T,>(
  selector: (store: CashShiftStore) => T,
): T => {
  const cashShiftStoreContext = useContext(CashShiftStoreContext);

  if (!cashShiftStoreContext) {
    throw new Error(
      `useCategoryStore must be use within CategoryStoreProvider`,
    );
  }

  return useStore(cashShiftStoreContext, selector);
};
