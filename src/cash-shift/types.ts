import { Order, Payment } from "@/order/types";
import { response } from "@/lib/types";

type CashShiftBase = {
  id: string;
  userId: string;
  initialAmount: number;
  finalAmount: number;
  totalSales: number;
  totalCashSales: number;
  totalDebitCardSales: number;
  totalCreditCardSales: number;
  totalWalletSales: number;
  orders: Order[];
  payments: Payment[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type OpenCashShift = CashShiftBase & {
  status: "open";
  openedAt: Date;
};

export type ClosedCashShift = CashShiftBase & {
  status: "closed";
  openedAt: Date;
  closed: Date;
};

export type CashShift = OpenCashShift | ClosedCashShift;

export type CashShiftWithOutOrders = Omit<CashShift, "orders" | "payments">;

export type CashShiftResponse = response<CashShift>;
