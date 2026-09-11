import type { DocumentStatus } from "@/document/types";
import type { Status } from "@/order/types";

const CANCELLATION_WINDOW_MS = 168 * 60 * 60 * 1000;

export function canCancelOrder({
  hasPermission,
  orderStatus,
  documentStatus,
  orderCreatedAt,
  now = new Date(),
}: {
  hasPermission: boolean;
  orderStatus: Status;
  documentStatus: DocumentStatus;
  orderCreatedAt: Date;
  now?: Date;
}): boolean {
  return (
    hasPermission &&
    orderStatus === "completed" &&
    documentStatus === "registered" &&
    now.getTime() - orderCreatedAt.getTime() < CANCELLATION_WINDOW_MS
  );
}
