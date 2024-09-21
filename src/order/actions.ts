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
import prisma, { setPrismaClient } from "@/lib/prisma";

export const create = async (
  userId: string,
  order: Order,
): Promise<response<{ order: Order; document: Document }>> => {
  // TODO: Implement order creator use case to manage the creation of an order logic
  const session = await getSession();
  const openCashShiftResponse = await getLastOpenCashShift(session.user.id);
  const billingCredentialsResponse = await getBillingCredentialsFor(
    session.user.companyId,
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

  return withinTransaction<{ order: Order; document: Document }>(
    async function () {
      const createOrderResponse = await createOrder({
        ...order,
        cashShiftId: openCashShift.id,
        companyId: session.user.companyId,
      });
      if (!createOrderResponse.success) {
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
  return await findCompany(session.user.companyId);
};

/**
 * Executes a given callback function within a database transaction context.
 * If the callback function resolves with a success response,
 * the transaction is committed; otherwise, it is rolled back.
 *
 * @param {Function} cb - A callback function that returns a promise of a response object.
 * @return {Promise<response<T>>} A promise that resolves with the response object returned by the callback function.
 */
async function withinTransaction<T>(
  cb: () => Promise<response<T>>,
): Promise<response<T>> {
  const previousPrismaClient = prisma();
  let value: response;

  try {
    await previousPrismaClient.$transaction(async (tx) => {
      setPrismaClient(tx as any);
      value = await cb();
      if (!value.success) {
        throw new Error("rollback transaction");
      }
    });
  } catch (e) {
    console.error("transaction rolled back");
  } finally {
    setPrismaClient(previousPrismaClient); // Reset to the previous client
  }

  // @ts-ignore
  return value;
}
