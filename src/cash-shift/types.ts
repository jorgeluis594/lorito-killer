import { Order, Payment } from "@/order/types";
import { response } from "@/lib/types";

export type Expense = {
  id: string;
  cashShiftId: string;
  amount: number;
  description?: string;
  createdAt: Date;
};

export type CashShiftBase = {
  id: string;
  userId: string;
  companyId: string;
  userName: string;
  initialAmount: number;
  totalSales: number;
  totalCashSales: number;
  totalDebitCardSales: number;
  totalCreditCardSales: number;
  totalWalletSales: number;
  amountInCashRegister: number;
  expenses: Expense[];
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

export type OrderItemType = {
  id: string;
  name: string;
  purchasePrice: number;
  price: number;
  quantity: number;
  total: number;
  totalDifference: number;
  createdAt: Date;
}

export type GrossProfit = {
  utility: number;
}