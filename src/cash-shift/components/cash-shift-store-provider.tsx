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

export const CashShiftStoreContext =
  createContext<StoreApi<CashShiftStore> | null>(null);

export interface CashShiftStoreProviderProps {
  children: ReactNode;
}

export const CategoryStoreProvider = async ({
  children,
}: CashShiftStoreProviderProps) => {
  const storeRef = useRef<StoreApi<CashShiftStore>>();
  const { toast } = useToast();

  if (!storeRef.current) {
    storeRef.current = createCashShiftStore({ ...defaultInitState });
  }

  const { cashShift, isLoading, setCashShift } = useCashShiftStore(
    (store) => store,
  );

  useEffect(() => {
    if (isLoading) {
      getLastOpenCashShift().then((response) => {
        if (response.success) {
          setCashShift(response.data);
        } else {
          toast({
            title: "Error",
            description: response.message,
            variant: "destructive",
          });
        }
      });
    }
  }, []);

  return (
    <CashShiftStoreContext.Provider value={storeRef.current}>
      {children}
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
