import type { Order, OrderItem } from "@/order/types";
import { response, successResponse } from "@/lib/types";

async function getOrders(): Promise<response<Order[]>> {
  const response = await fetch("/api/orders");
  if (!response.ok) {
    return { success: false, message: "No se pudo conectact con el servidor" };
  }

  const ordersResponse: response<Order[]> = await response.json();
  if (!ordersResponse.success) {
    return { success: false, message: ordersResponse.message };
  }

  return ordersResponse;
}
