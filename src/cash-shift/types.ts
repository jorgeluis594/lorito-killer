import { Order, Payment } from "@/order/types";
import { response } from "@/lib/types";

type CashShiftBase = {
  id: string;
  userId: string;
  initialAmount: number;
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
  finalAmount: number;
  openedAt: Date;
  closedAt: Date;
};

export type CashShift = OpenCashShift | ClosedCashShift;

export type CashShiftWithOutOrders = Omit<
  CashShift,
  | "orders"
  | "payments"
  | "totalSales"
  | "totalCashSales"
  | "totalWalletSales"
  | "totalCreditCardSales"
  | "totalDebitCardSales"
>;

export type CashShiftResponse = response<CashShift>;
