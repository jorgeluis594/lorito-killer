"use server";

import { Order } from "@/order/types";
import { response } from "@/lib/types";
import { getMany, rollbackStock, update } from "@/stock-transfer/db_repository";
import { update as updateOrder } from "@/order/db_repository";
import { log } from "@/lib/log";
import { withinTransaction } from "@/lib/prisma";
import { StockTransfer } from "@/stock-transfer/types";

const cancel = async (order: Order): Promise<response<Order>> => {
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

  return withinTransaction<Order>(async () => {
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

    const updateOrderResponse = await updateOrder(order);
    if (!updateOrderResponse.success) {
      return {
        success: false,
        message: "Error actualizando la venta, comuniquese con soporte",
      };
    }

    return { success: true, data: updateOrderResponse.data };
  });
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
