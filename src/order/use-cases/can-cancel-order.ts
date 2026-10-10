import type { DocumentStatus } from "@/document/types";
import type { Order, PaymentStatus, Status } from "@/order/types";
import { isFulfillmentOrderType } from "@/order/fulfillment-order-types";

const CANCELLATION_WINDOW_MS = 168 * 60 * 60 * 1000;


export function canCancelOrder({
  hasPermission,
  orderStatus,
  paymentStatus,
  hasDishProduct,
  documentStatus,
  orderCreatedAt,
  orderType,
  now = new Date(),
}: {
  hasPermission: boolean;
  orderStatus: Status;
  paymentStatus: PaymentStatus | undefined;
  hasDishProduct: boolean;
  documentStatus: DocumentStatus;
  orderCreatedAt: Date;
  orderType: Order["orderType"];
  now?: Date;
}): boolean {
  return (
    hasPermission &&
    !isFulfillmentOrderType(orderType) &&
    !(paymentStatus === "paid" && hasDishProduct) &&
    orderStatus === "completed" &&
    documentStatus === "registered" &&
    now.getTime() - orderCreatedAt.getTime() < CANCELLATION_WINDOW_MS
  );
}
