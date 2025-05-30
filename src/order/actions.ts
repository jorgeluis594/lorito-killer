"use server";

import { Order } from "./types";
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
import { createDocument } from "@/document/use_cases/create-document";
import billingDocumentGateway from "@/document/factpro/gateway";
import {
  createDocument as saveDocument,
  getLatestDocumentNumber,
  getBillingCredentialsFor,
} from "@/document/db_repository";
import type { Document } from "@/document/types";
import { withinTransaction } from "@/lib/prisma";
import calculateDiscount from "@/order/use-cases/calculate_discount";
import { log } from "@/lib/log";
import cancel from "@/order/use-cases/cancel";
import { formatInTimeZone } from "date-fns-tz";

export const create = async (
  userId: string,
  order: Order,
): Promise<response<{ order: Order; document: Document }>> => {
  // TODO: Implement order creator use case to manage the creation of an order logic
  const { user } = await getSession();
  if (!user) {
    return { success: false, message: "No hay usuario autenticado" };
  }
  const openCashShiftResponse = await getLastOpenCashShift(user.id);
  const billingCredentialsResponse = await getBillingCredentialsFor(
    user.companyId,
  );
  if (!billingCredentialsResponse.success) {
    return {
      success: false,
      message: "No se encontraron credenciales de facturación",
    };
  }

  if (!openCashShiftResponse.success) {
    return { success: false, message: "No tienes una caja abierta" };
  }

  const openCashShift = openCashShiftResponse.data;
  if (openCashShift.id !== order.cashShiftId) {
    log.warn("order_cash_shift_mismatch", {
      orderCashShiftId: order.cashShiftId,
      lastOpenCashShiftId: openCashShift.id,
    });
    order.cashShiftId = openCashShift.id;
    /*return {
      success: false,
      message: "La caja abierta no coincide con la caja de la venta",
    };*/
  }

  if (openCashShift.userId !== user.id) {
    return {
      success: false,
      message: "La caja abierta no pertenece al usuario",
    };
  }

  const discountResponse = calculateDiscount(order);
  if (!discountResponse.success) {
    return { success: false, message: "Error generando descuento" };
  }

  return withinTransaction<{ order: Order; document: Document }>(
    async function () {
      const createOrderResponse = await createOrder({
        ...discountResponse.data,
        cashShiftId: openCashShift.id,
        companyId: user.companyId,
      });
      if (!createOrderResponse.success) {
        log.error("create_order_failed",{})
        return createOrderResponse;
      }

      revalidatePath("/api/orders");
      const updateStockResponse = await updateStock(userId, order, {
        findProduct,
        createStockTransfer,
        updateStock: UpdateStockFromStockTransfer,
      });

      if (!updateStockResponse.success) {
        return updateStockResponse;
      }

      const { billingToken, ...billingSettings } =
        billingCredentialsResponse.data;
      const documentResponse = await createDocument(
        billingDocumentGateway({ billingToken }),
        {
          createDocument: saveDocument,
          getLastDocumentNumber: getLatestDocumentNumber,
        },
        createOrderResponse.data,
        billingSettings,
      );
      if (!documentResponse.success) {
        return documentResponse;
      }

      return {
        success: true,
        data: {
          order: { ...createOrderResponse.data },
          document: { ...documentResponse.data },
        },
      };
    },
  );
};

export const getCompany = async (): Promise<response<Company>> => {
  const session = await getSession();
  if (!session.user) {
    return { success: false, message: "No hay usuario autenticado" };
  }
  return await findCompany(session.user.companyId);
};

export const cancelOrder = async (order: Order, cancellationReason: string): Promise<response<Order>> => {
  return cancel(order, cancellationReason);
}
