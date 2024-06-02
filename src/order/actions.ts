"use server";

import { Order, OrderItem } from "./types";
import { response } from "@/lib/types";
import { create as createOrder } from "./db_repository";
import { revalidatePath } from "next/cache";
import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import { getCompany as findCompany } from "@/company/db_repository";
import { find as findProduct } from "@/product/db_repository";
import { updateStock as UpdateStockFromStocktransfer } from "@/stock-transfer/db_repository";
import { updateStock } from "@/order/use-cases/update-stock";
import { getSession } from "@/lib/auth";
import { Company } from "@/company/types";

export const create = async (data: Order): Promise<response<Order>> => {
  // TODO: Implement order creator use case to manage the creation of an order logic
  const session = await getSession();
  const openCashShiftResponse = await getLastOpenCashShift(session.user.id);
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

  if (openCashShift.userId !== session.user.id) {
    return {
      success: false,
      message: "La caja abierta no pertenece al usuario",
    };
  }

  const createOrderResponse = await createOrder({
    ...data,
    cashShiftId: openCashShift.id,
    companyId: session.user.companyId,
  });
  if (createOrderResponse.success) {
    revalidatePath("/api/orders");
    await updateStock(createOrderResponse.data, {
      findProduct,
      updateStock: UpdateStockFromStocktransfer,
    });
  }

  return createOrderResponse;
};

export const getCompany = async (): Promise<response<Company>> => {
  const session = await getSession();
  return await findCompany(session.user.companyId);
};
