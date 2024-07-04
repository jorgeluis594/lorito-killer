"use server";

import { Order, OrderItem } from "./types";
import { response } from "@/lib/types";
import { create as createOrder } from "./db_repository";
import { revalidatePath } from "next/cache";
import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import { getCompany as findCompany } from "@/company/db_repository";
import { find as findProduct } from "@/product/db_repository";
import {
  updateStock as UpdateStockFromStockTransfer,
  create as createStockTransfer,
} from "@/stock-transfer/db_repository";
import { updateStock } from "@/order/use-cases/update-stock";
import { getSession } from "@/lib/auth";
import { Company } from "@/company/types";

export const create = async (
  userId: string,
  order: Order,
): Promise<response<Order>> => {
  // TODO: Implement order creator use case to manage the creation of an order logic
  const session = await getSession();
  const openCashShiftResponse = await getLastOpenCashShift(session.user.id);
  if (!openCashShiftResponse.success) {
    return { success: false, message: "No tienes una caja abierta" };
  }

  const openCashShift = openCashShiftResponse.data;

  if (openCashShift.id !== order.cashShiftId) {
    return {
      success: false,
      message: "La caja abierta no coincide con la caja de la venta",
    };
  }

  if (openCashShift.userId !== session.user.id) {
    return {
      success: false,
      message: "La caja abierta no pertenece al usuario",
    };
  }

  const createOrderResponse = await createOrder({
    ...order,
    cashShiftId: openCashShift.id,
    companyId: session.user.companyId,
  });
  if (!createOrderResponse.success) {
    return createOrderResponse;
  }

  revalidatePath("/api/orders");
  const updateStockResponse = await updateStock(
    userId,
    createOrderResponse.data,
    {
      findProduct,
      createStockTransfer,
      updateStock: UpdateStockFromStockTransfer,
    },
  );

  if (!updateStockResponse.success) {
    return updateStockResponse;
  }

  return { success: true, data: createOrderResponse.data };
};

export const getCompany = async (): Promise<response<Company>> => {
  const session = await getSession();
  return await findCompany(session.user.companyId);
};
