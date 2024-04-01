import type { Order } from "@/order/types";
import { response } from "@/lib/types";

export const getOrders = async (): Promise<response<Order[]>> => {
  const response = await fetch("/api/orders");
  if (!response.ok) {
    return { success: false, message: "No se pudo conectact con el servidor" };
  }

  const ordersResponse = await response.json();
  if (!ordersResponse.success) {
    return { success: false, message: ordersResponse.message };
  }

  const order = ordersResponse.data.map((order: any) => ({
    ...order,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
  }));

  return { success: true, data: order };
};
