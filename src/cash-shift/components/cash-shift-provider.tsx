"use client";

import { createContext, ReactNode, useContext } from "react";
import { OpenCashShift } from "@/cash-shift/types";
import { response } from "@/lib/types";
import useSignOut from "@/lib/use-sign-out";

const CashShiftContext = createContext<OpenCashShift | undefined | null>(null);

export const CashShiftProvider = ({
  cashShiftResponse,
  children,
}: {
  cashShiftResponse: response<OpenCashShift>;
  children: ReactNode;
}) => {
  const signOut = useSignOut();

  if (!cashShiftResponse.success && cashShiftResponse.type === "AuthError") {
    signOut();
    return;
  }

  return (
    <CashShiftContext.Provider
      value={cashShiftResponse.success ? cashShiftResponse.data : undefined}
    >
      {children}
    </CashShiftContext.Provider>
  );
};

export const useCashShift = (): OpenCashShift | undefined => {
  const cashShift = useContext(CashShiftContext);
  if (cashShift === null) {
    throw new Error("useCashShift mut be used withing CashShiftProvider");
  }

  return cashShift;
};
