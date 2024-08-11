import { Order, OrderWithBusinessCustomer } from "@/order/types";
import { isBusinessCustomer } from "@/customer/utils";

export const hasBusinessCustomer = (
  order: Order,
): order is OrderWithBusinessCustomer => {
  if (!order.customer) return false;

  return isBusinessCustomer(order.customer);
};
