import type { DocumentStatus } from "@/document/types";
import type { PaymentStatus, Status } from "@/order/types";

const CANCELLATION_WINDOW_MS = 168 * 60 * 60 * 1000;

export function canCancelOrder({
  hasPermission,
  orderStatus,
  paymentStatus,
  hasDishProduct,
  documentStatus,
  orderCreatedAt,
  now = new Date(),
}: {
  hasPermission: boolean;
  orderStatus: Status;
  paymentStatus: PaymentStatus | undefined;
  hasDishProduct: boolean;
  documentStatus: DocumentStatus;
  orderCreatedAt: Date;
  now?: Date;
}): boolean {
  return (
    hasPermission &&
    !(paymentStatus === "paid" && hasDishProduct) &&
    orderStatus === "completed" &&
    documentStatus === "registered" &&
    now.getTime() - orderCreatedAt.getTime() < CANCELLATION_WINDOW_MS
  );
}
