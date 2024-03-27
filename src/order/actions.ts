"use server";

import { Order } from "./types";
import { response } from "@/lib/types";
import { create as createOrder } from "./db_repository";

export const create = async (data: Order): Promise<response<Order>> => {
  return await createOrder(data);
};
