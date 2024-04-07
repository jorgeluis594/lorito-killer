import { CashPayment } from "@/order/types";

export const BlankCashPayment: CashPayment = {
  amount: 0,
  method: "cash",
  received_amount: 0,
  change: 0,
};
