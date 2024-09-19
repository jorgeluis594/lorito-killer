"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { type StoreApi, useStore } from "zustand";

import {
  type LogoStore,
  createLogoStore,
  initLogosParams
} from "@/company/store";

export const LogoStoreContext =
  createContext<StoreApi<LogoStore> | null>(null);

export interface LogoStoreProviderProps {
  children: ReactNode;
}

export const LogoStoreProvider = ({
  children,
}: LogoStoreProviderProps) => {
  const storeRef = useRef<StoreApi<LogoStore>>();
  if (!storeRef.current) {
    storeRef.current = createLogoStore(initLogosParams());
  }

  return (
    <LogoStoreContext.Provider value={storeRef.current}>
      {children}
    </LogoStoreContext.Provider>
  );
};

export const useLogoStore = <T,>(
  selector: (store: LogoStore) => T,
): T => {
  const logoStoreContext = useContext(LogoStoreContext);

  if (!logoStoreContext) {
    throw new Error(
      `useCategoryStore must be use within LogoStoreProvider`,
    );
  }

  return useStore(logoStoreContext, selector);
};
