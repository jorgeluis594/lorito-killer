import { Order, Payment } from "@/order/types";

export type CashShift = {
  id: string;
  userId: string;
  start: Date;
  end: Date;
  status: "open" | "closed";
  initialAmount: number;
  finalAmount: number;
  totalSales: number;
  totalCashSales: number;
  totalDebitCardSales: number;
  totalCreditCardSales: number;
  totalWalletSales: number;
  orders: Order[];
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
};
