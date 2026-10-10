type DeliveryStatus = "PENDING" | "DISPATCHED" | "DELIVERED";

export const NO_LAST_PRODUCT_MESSAGE =
  "El pedido debe conservar al menos un producto activo.";

export const PRODUCTS_LOCKED_MESSAGE =
  "El pedido ya no admite cambios de productos.";

/**
 * Productos de un pedido Para llevar o Delivery: editables solo mientras no
 * exista documento local y, en Delivery, no se haya despachado.
 */
export function canEditFulfillmentProducts({
  orderType,
  deliveryStatus,
  hasDocument,
}: {
  orderType: "TAKE_AWAY" | "DELIVERY";
  deliveryStatus: DeliveryStatus | null | undefined;
  hasDocument: boolean;
}): boolean {
  if (hasDocument) return false;
  if (orderType === "DELIVERY") return deliveryStatus === "PENDING";
  return true;
}

/** El retiro no puede dejar el pedido sin cantidades activas. */
export function leavesActiveProducts(
  remainingQuantities: readonly number[],
): boolean {
  return remainingQuantities.some((quantity) => quantity > 0);
}
