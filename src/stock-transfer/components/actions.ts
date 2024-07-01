"use server";

import { find as findProduct } from "@/product/db_repository";
import { processStockTransfer } from "@/stock-transfer/use-cases/process-stock-transfer";
import {
  create as createStockTransfer,
  updateStock,
} from "@/stock-transfer/db_repository";
import {
  ProductMovementStockTransfer,
  ProductMovementStockTransferName,
  StockTransfer,
} from "@/stock-transfer/types";
import { response } from "@/lib/types";
import { SingleProduct } from "@/product/types";

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

export const performProductMovementStockTransfer = async (
  parentProduct: SingleProduct,
): Promise<response<StockTransfer[]>> => {
  if (!parentProduct.stockConfig) {
    return { success: false, message: "Product has no stock configuration" };
  }

  const receiverProductResponse = await findProduct(
    parentProduct.stockConfig.productId,
  );

  if (!receiverProductResponse.success) {
    return receiverProductResponse;
  }

  const stockTransfers: ProductMovementStockTransfer[] = [
    // Remove stock from parent product
    {
      id: crypto.randomUUID(),
      productId: parentProduct.id!,
      companyId: parentProduct.companyId!,
      value: -1,
      type: ProductMovementStockTransferName,
      productName: parentProduct.name,
      fromProductId: parentProduct.id!,
      toProductId: receiverProductResponse.data.id!,
      createdAt: new Date(),
    },
    // Add stock to receiver product
    {
      id: crypto.randomUUID(),
      productId: receiverProductResponse.data.id!,
      companyId: receiverProductResponse.data.companyId!,
      value: parentProduct.stockConfig.quantity,
      type: ProductMovementStockTransferName,
      productName: receiverProductResponse.data.name,
      fromProductId: parentProduct.id!,
      toProductId: receiverProductResponse.data.id!,
      createdAt: new Date(),
    },
  ];

  const performStockTransferResponses =
    await createAndProcessStockTransfers(stockTransfers);

  console.log(performStockTransferResponses);
  if (performStockTransferResponses.some((response) => !response.success)) {
    return { success: false, message: "Error" };
  }

  return { success: true, data: stockTransfers };
};
