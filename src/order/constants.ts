import { CashPayment } from "@/order/types";

export const BlankCashPayment: CashPayment = {
  cashShiftId: "",
  amount: 0,
  method: "cash",
  received_amount: 0,
  change: 0,
};
