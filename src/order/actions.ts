"use server";

import { Order } from "./types";
import { response } from "@/lib/types";
import { create as createOrder } from "./db_repository";
import { revalidatePath } from "next/cache";

export const create = async (data: Order): Promise<response<Order>> => {
  const createOrderResponse = await createOrder(data);
  if (createOrderResponse.success) {
    revalidatePath("/api/orders");
  }

  return createOrderResponse;
};
