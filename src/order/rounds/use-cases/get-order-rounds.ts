import type { response } from "@/lib/types";
import type { OrderRoundView } from "../types";

export const getOrderRounds = (
  orderId: string,
  find: (orderId: string) => Promise<OrderRoundView[]>,
): Promise<response<OrderRoundView[]>> =>
  find(orderId).then((data) => ({ success: true, data }));
