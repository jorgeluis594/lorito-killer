"use client";

import {
  type ReactNode,
  createContext,
  useRef,
  useContext,
  useEffect,
} from "react";
import { useToast } from "@/components/ui/use-toast";
import { type StoreApi, useStore } from "zustand";

import {
  type CashShiftStore,
  createCashShiftStore,
  defaultInitState,
} from "@/cash-shift/components/store";
import { getLastOpenCashShift } from "@/cash-shift/api_repository";
import { useOrderFormActions } from "@/components/forms/order-form/order-form-provider";

export const CashShiftStoreContext =
  createContext<StoreApi<CashShiftStore> | null>(null);

export interface CashShiftStoreProviderProps {
  children: ReactNode;
}

const CashShiftLoader = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { isLoading, setCashShift } = useCashShiftStore((store) => store);
  const { setCashShift: setCashShiftToOrder } = useOrderFormActions();

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
          setCashShift(null);
          toast({
            description:
              "No tienes una caja abierta, abre una para generar ventas",
          });
        }
      });
    }
  }, []);

  return <>{children}</>;
};

export const CashShiftStoreProvider = ({
  children,
}: CashShiftStoreProviderProps) => {
  const storeRef = useRef<StoreApi<CashShiftStore>>();

  if (!storeRef.current) {
    storeRef.current = createCashShiftStore({ ...defaultInitState });
  }

  return (
    <CashShiftStoreContext.Provider value={storeRef.current}>
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
