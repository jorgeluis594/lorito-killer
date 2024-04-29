export type OrderItem = {
  id?: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Order = {
  id?: string;
  cashShiftId: string;
  companyId: string;
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
  cashShiftId: string;
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
  operationCode?: string;
  name?: string;
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
