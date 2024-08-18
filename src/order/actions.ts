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
import { createDocument } from "@/document/use_cases/create-document";
import { createInvoice, createReceipt } from "@/document/factpro_gateway";
import { createdDocument } from "@/document/db_repository";
import { createCustomer } from "@/customer/db_repository";
import type { Document, DocumentType } from "@/document/types";

export const create = async (
  userId: string,
  order: Order & { documentType: DocumentType },
): Promise<
  response<Order & { documentType: DocumentType; document: Document }>
> => {
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
    documentType: order.documentType,
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

  const companyResponse = await findCompany(session.user.companyId);
  if (!companyResponse.success) {
    return { success: false, message: "no se encontro empresa" };
  }

  const documentResponse = await createDocument(
    { createReceipt, createInvoice },
    { createdDocument, createCustomer },
    {
      id: crypto.randomUUID(),
      cashShiftId: openCashShift.id,
      companyId: companyResponse.data.id,
      orderItems: order.orderItems,
      total: order.total,
      status: order.status,
      payments: order.payments,
      documentType: "invoice",
    },
    companyResponse.data,
  );
  if (!documentResponse.success) {
    return documentResponse;
  }

  return {
    success: true,
    data: {
      ...order,
      documentType: documentResponse.data.documentType,
      document: documentResponse.data,
    },
  };
};

export const getCompany = async (): Promise<response<Company>> => {
  const session = await getSession();
  return await findCompany(session.user.companyId);
};
