import { Product } from "@/product/types";

export type OrderItem = {
  id?: string;
  product: Product;
  quantity: number;
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Order = {
  id?: string;
  orderItems: OrderItem[];
  total: number;
  status: "pending" | "completed" | "cancelled";
  payments: Payment[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "wallet";

export type PaymentGeneralData = {
  id?: string;
  orderId?: string;
  amount: number;
  method: PaymentMethod;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreditCardPayment = PaymentGeneralData & {
  method: "credit_card";
};

export type DebitCardPayment = PaymentGeneralData & {
  method: "debit_card";
};

export type WalletPayment = PaymentGeneralData & {
  method: "wallet";
};

export type CashPayment = PaymentGeneralData & {
  method: "cash";
  received_amount: number;
  change: number;
};

export type Payment =
  | CreditCardPayment
  | DebitCardPayment
  | WalletPayment
  | CashPayment;
