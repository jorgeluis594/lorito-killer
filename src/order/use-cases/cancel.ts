"use server";

import { Order } from "@/order/types";
import { response } from "@/lib/types";
import { getMany, rollbackStock, update } from "@/stock-transfer/db_repository";
import { update as updateOrder } from "@/order/db_repository";
import { log } from "@/lib/log";
import { StockTransfer } from "@/stock-transfer/types";
import { createDocument } from "@/document/use_cases/create-document";
import billingDocumentGateway from "@/document/factpro/gateway";
import {
  createDocument as saveDocument,
  findDocument,
  getBillingCredentialsFor,
  update as updateDocument,
  getLatestDocumentNumber,
} from "@/document/db_repository";
import { getSession } from "@/lib/auth";

const cancel = async (
  order: Order,
  cancellationReason: string,
): Promise<response<Order>> => {
  const stockTransfersResponse = await getMany({
    companyId: order.companyId,
    orderId: order.id!,
  });

  if (!stockTransfersResponse.success) {
    log.error("fetch_stock_transfers_failed", {
      orderId: order.id,
      message: stockTransfersResponse.message,
    });
    return {
      success: false,
      message: "Error restaurando stock de la venta, comuniquese con soporte",
    };
  }

  const results = await Promise.all(
    stockTransfersResponse.data.map((stockTransfer) =>
      performRollbackStockTransfer(stockTransfer, order.id!),
    ),
  );

  if (results.some((result) => !result.success)) {
    log.error("rollback_stock_failed", {
      orderId: order.id,
      results,
    });
    return {
      success: false,
      message: "Error restaurando stock de la venta, comuniquese con soporte",
    };
  }

  const session = await getSession();
  if (!session.user)
    return { success: false, message: "No se encontró la sesión" };

  const billingCredentialsResponse = await getBillingCredentialsFor(
    session.user.companyId,
  );
  if (!billingCredentialsResponse.success) {
    return {
      success: false,
      message: "No se encontraron credenciales de facturación",
    };
  }

  const { billingToken } = billingCredentialsResponse.data;
  const { cancelDocument } = billingDocumentGateway({ billingToken });

  const documentFound = await findDocument(order.id!);
  if (!documentFound.success) {
    log.error("document_not_found", { document });
    return {
      success: false,
      message: documentFound.message,
    };
  }

  const cancelDocumentResponse = await cancelDocument(
    documentFound.data,
    cancellationReason,
  );

  if (!cancelDocumentResponse.success) {
    log.error("document_not_cancelled", { cancelDocumentResponse });
    return {
      success: false,
      message: cancelDocumentResponse.message,
    };
  }
  const updatedDocument = await updateDocument(cancelDocumentResponse.data);
  if (!updatedDocument.success) {
    return {
      success: false,
      message: updatedDocument.message,
    };
  }

  const updateOrderResponse = await updateOrder({
    ...order,
    status: "cancelled",
    cancellationReason: cancellationReason,
  });
  if (!updateOrderResponse.success) {
    return {
      success: false,
      message: "Error actualizando la venta, comuniquese con soporte",
    };
  }

  return { success: true, data: updateOrderResponse.data };
};

const performRollbackStockTransfer = async (
  stockTransfer: StockTransfer,
  orderId: string,
): Promise<response<undefined>> => {
  const [rollbackResponse, updateResponse] = await Promise.all([
    rollbackStock(stockTransfer),
    update(stockTransfer),
  ]);

  if (!rollbackResponse.success || !updateResponse.success) {
    log.error("rollback_stock_transfer_failed", {
      orderId,
      stockTransferId: stockTransfer.id,
      rollbackResponse,
      updateResponse,
    });
    return {
      success: false,
      message: "Error restaurando stock de la venta, comuniquese con soporte",
    };
  }

  return { success: true, data: undefined };
};

export default cancel;
