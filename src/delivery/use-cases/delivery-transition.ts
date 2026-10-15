export type DeliveryState = "PENDING" | "DISPATCHED" | "DELIVERED";

/** Se entrega con o sin cobro: un pedido contra entrega se cobra al volver. */
export function getDeliveryTransition(
  state: DeliveryState,
  action: "DISPATCH" | "DELIVER",
): { success: true; data: DeliveryState } | { success: false; message: string } {
  if (action === "DISPATCH")
    return { success: true, data: state === "PENDING" ? "DISPATCHED" : state };
  if (state === "PENDING")
    return { success: false, message: "Primero registra el despacho." };
  return { success: true, data: "DELIVERED" };
}
