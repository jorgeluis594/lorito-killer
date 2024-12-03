import { KG_UNIT_TYPE, UNIT_UNIT_TYPE } from "@/product/types";
import type { BusinessCustomer, Customer } from "@/customer/types";
import { DocumentType, InvoiceType, Document } from "@/document/types";

export type OrderItem = {
  id?: string;
  productId: string;
  productSku?: string; // TODO: add orderCode to db repository
  productName: string;
  productPrice: number;
  quantity: number;
  unitType: typeof KG_UNIT_TYPE | typeof UNIT_UNIT_TYPE;
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export const AMOUNT = "amount";

export type AmountType = typeof AMOUNT;

export const PERCENT = "percent";

export type PercentType = typeof PERCENT;

export type AmountDiscount = {
  value: number;
  type: AmountType;
};

export type PercentDiscount = {
  value: number;
  type: PercentType;
};

export type Discount = AmountDiscount | PercentDiscount;

export type Status = "pending" | "completed" | "cancelled";

export type Order = {
  id?: string;
  cashShiftId: string;
  companyId: string;
  customerId?: string;
  orderItems: OrderItem[];
  netTotal: number;
  discountAmount: number;
  total: number;
  cancellationReason?: string;
  status: Status;
  payments: Payment[];
  discount?: Discount;
  documentType: DocumentType;
  document?: Document;
  customer?: Customer;
  createdAt?: Date;
  updatedAt?: Date;
};

export type OrderWithBusinessCustomer = Omit<
  Order,
  "customer" | "documentType"
> & {
  customer: BusinessCustomer;
  documentType: InvoiceType;
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
