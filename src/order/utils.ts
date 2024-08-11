import { Order, OrderWithBusinessCustomer } from "@/order/types";
import { RUC } from "@/customer/types";

export const hasBusinessCustomer = (
  order: Order,
): order is OrderWithBusinessCustomer => {
  return !!order.customer && order.customer.documentType == RUC;
};
