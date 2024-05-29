import { createStore } from "zustand/vanilla";
import { OpenCashShift } from "@/cash-shift/types";
import { Order } from "@/order/types";

export type CashShiftState =
  | { cashShift: OpenCashShift | null; isLoading: false }
  | { cashShift: null; isLoading: true };

export type CashShiftActions = {
  setCashShift: (cashShift: OpenCashShift | null) => void;
  setIsLoading: () => void;
  // setCashShiftStatus: (status: string) => void;
  removeCashShift: () => void;
  addOrder: (order: Order) => void;
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
    setCashShift: (cashShift: OpenCashShift | null) =>
      set({ cashShift, isLoading: false }),
    removeCashShift: () => set({ cashShift: null, isLoading: false }),
    setIsLoading: () => set({ isLoading: true, cashShift: null }),
    // setCashShiftStatus: (status) => set(state => ({ states: state.cashShift.map(s => s.)})),
    addOrder: (order: Order) => {
      set((state) => {
        if (state.cashShift) {
          if (state.cashShift.orders.find((o) => o.id === order.id)) {
            return state;
          }

          state.cashShift.orders.push(order);
          return {
            cashShift: {
              ...state.cashShift,
              orders: [...state.cashShift.orders, order].sort(
                (a, b) => b.createdAt!.getTime() - a.createdAt!.getTime(),
              ),
            },
          };
        } else {
          return state;
        }
      });
    },
  }));
};
