import {Order, OrderWithBusinessCustomer} from "@/order/types";
import {RUC} from "@/document/types";

export const hasBusinessCustomer = (order: Order): order is OrderWithBusinessCustomer => {
  return !!order.customer && order.customer.documentType == RUC;
}
