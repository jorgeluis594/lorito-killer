/** Un despacho se considera atrasado cuando lleva 2 horas o más en la calle. */
export const DELIVERY_OVERDUE_AFTER_MS = 2 * 60 * 60 * 1000;

export function isDeliveryOverdue(
  delivery: {
    status: "PENDING" | "DISPATCHED" | "DELIVERED";
    dispatchedAt: Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (delivery.status !== "DISPATCHED" || !delivery.dispatchedAt) return false;
  return (
    now.getTime() - delivery.dispatchedAt.getTime() >= DELIVERY_OVERDUE_AFTER_MS
  );
}
