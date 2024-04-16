import { createStore } from "zustand/vanilla";
import { CashShift } from "@/cash-shift/types";

export type CashShiftState =
  | { cashShift: CashShift | null; isLoading: false }
  | { cashShift: null; isLoading: true };

export type CashShiftActions = {
  setCashShift: (cashShift: CashShift | null) => void;
  setIsLoading: () => void;
};

export type CashShiftStore = CashShiftState & CashShiftActions;

export const defaultInitState: CashShiftState = {
  cashShift: null,
  isLoading: true,
};

export const createCashShiftStore = (
  initState: CashShiftState = { ...defaultInitState },
) => {
  return createStore<CashShiftStore>()((set) => ({
    ...initState,
    setCashShift: (cashShift: CashShift | null) =>
      set({ cashShift, isLoading: false }),
    setIsLoading: () => set({ isLoading: true, cashShift: null }),
  }));
};
