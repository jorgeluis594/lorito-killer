"use server";

import { Order, OrderItem } from "./types";
import { response } from "@/lib/types";
import { create as createOrder } from "./db_repository";
import { revalidatePath } from "next/cache";
import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import {
  find as findProduct,
  update as updateProduct,
} from "@/product/db_repository";
import { getSession } from "@/lib/auth";
import { Product } from "@/product/types";

export const create = async (data: Order): Promise<response<Order>> => {
  // TODO: Implement order creator use case to manage the creation of an order logic
  const session = await getSession();
  const openCashShiftResponse = await getLastOpenCashShift(session.userId);
  if (!openCashShiftResponse.success) {
    return { success: false, message: "No tienes una caja abierta" };
  }

  const openCashShift = openCashShiftResponse.data;

  if (openCashShift.id !== data.cashShiftId) {
    return {
      success: false,
      message: "La caja abierta no coincide con la caja de la venta",
    };
  }

  if (openCashShift.userId !== session.userId) {
    return {
      success: false,
      message: "La caja abierta no pertenece al usuario",
    };
  }

  const createOrderResponse = await createOrder(data);
  if (createOrderResponse.success) {
    revalidatePath("/api/orders");
    await updateProductsStocks(createOrderResponse.data);
  }

  return createOrderResponse;
};

async function updateProductsStocks(order: Order) {
  const productsIds = order.orderItems.map((oi) => oi.productId);
  const productsResponse = await Promise.all(
    productsIds.map((id) => findProduct(id)),
  );
  const orderItemsByProductMapper = order.orderItems.reduce(
    (acc: Record<string, OrderItem>, oi) => {
      acc[oi.productId] = oi;
      return acc;
    },
    {},
  );

  const products = productsResponse
    .filter((r) => r.success)
    .map((r) => (r.success && r.data) as Product);

  Promise.all(
    products.map((product) =>
      updateProduct({
        ...product,
        stock: product.stock - orderItemsByProductMapper[product.id!].quantity,
      }),
    ),
  );
}
