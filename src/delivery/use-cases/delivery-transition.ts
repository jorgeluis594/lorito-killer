import type { response } from "@/lib/types";

export type DeliveryState = "PENDING" | "DISPATCHED" | "DELIVERED";

export function getDeliveryTransition(
  state: DeliveryState,
  action: "DISPATCH" | "DELIVER",
  paymentStatus: "PENDING" | "PAID",
): response<DeliveryState> {
  if (action === "DISPATCH") {
    return state === "PENDING"
      ? { success: true, data: "DISPATCHED" }
      : { success: true, data: state };
  }
  if (state === "PENDING")
    return { success: false, message: "Primero registra el despacho." };
  if (paymentStatus !== "PAID")
    return {
      success: false,
      message: "El pedido debe estar pagado antes de entregarlo.",
    };
  return { success: true, data: "DELIVERED" };
}
