import { KG_UNIT_TYPE, UNIT_UNIT_TYPE } from "@/product/types";
import {Customer, BusinessCustomer, DniType, RucType} from "@/document/types";

export type OrderItem = {
  id?: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  unitType: typeof KG_UNIT_TYPE | typeof UNIT_UNIT_TYPE;
  total: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export const INVOICE = "invoice";
export type InvoiceType = typeof INVOICE;

export const RECEIPT = "receipt"
export type ReceiptType = typeof RECEIPT

export const TICKET = "ticket"
export type TicketType = typeof RECEIPT

type DocumentType = InvoiceType | ReceiptType | TicketType;

export type Order = {
  id?: string;
  cashShiftId: string;
  companyId: string;
  orderItems: OrderItem[];
  total: number;
  status: "pending" | "completed" | "cancelled";
  payments: Payment[];
  documentType: DocumentType;
  customer?: Customer;
  createdAt?: Date;
  updatedAt?: Date;
};

export type OrderWithBusinessCustomer = Omit<Order, 'customer'> & { customer: BusinessCustomer }

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
