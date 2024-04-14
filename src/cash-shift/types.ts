import { Order, Payment } from "@/order/types";

export type CashShift = {
  id: string;
  userId: string;
  start: Date;
  end: Date;
  isOpened: boolean;
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
