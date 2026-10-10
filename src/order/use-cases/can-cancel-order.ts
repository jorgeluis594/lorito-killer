import type { DocumentStatus } from "@/document/types";
import type { PaymentStatus, Status } from "@/order/types";

const CANCELLATION_WINDOW_MS = 168 * 60 * 60 * 1000;

export const NON_CANCELLABLE_ORDER_TYPES = ["TAKE_AWAY", "DELIVERY"] as const;

export const isFulfillmentOrderType = (
  orderType: string | null | undefined,
): orderType is (typeof NON_CANCELLABLE_ORDER_TYPES)[number] =>
  orderType === "TAKE_AWAY" || orderType === "DELIVERY";

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
  orderType?: string | null;
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
