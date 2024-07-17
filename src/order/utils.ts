import {Order, OrderWithCustomer} from "@/order/types";

export const hasCustomer = (order: Order): order is OrderWithCustomer => {
  return !!order.customer;
}
