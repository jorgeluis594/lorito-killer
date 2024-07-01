"use server";

import { find as findProduct } from "@/product/db_repository";
import { processStockTransfer } from "@/stock-transfer/use-cases/process-stock-transfer";
import {
  updateStock,
  create as createStockTransfer,
} from "@/stock-transfer/db_repository";
import { StockTransfer } from "@/stock-transfer/types";
import { response } from "@/lib/types";

export const createAndProcessStockTransfers = async (
  stockTransfers: StockTransfer[],
): Promise<response<StockTransfer>[]> => {
  return await Promise.all(
    stockTransfers.map((stockTransfer) =>
      processStockTransfer({
        repository: {
          findProduct,
          updateStock,
          createStockTransfer,
        },
        stockTransfer,
      }),
    ),
  );
};
