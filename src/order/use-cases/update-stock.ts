import { Order } from "@/order/types";
import { response } from "@/lib/types";
import { type StockTransfer } from "@/stock-transfer/types";
import { Product } from "@/product/types";
import {
  generateOrderStocksTransfers,
  validateStockTransfers,
} from "@/stock-transfer/use-cases/generate-order-stock-transfer";

interface Repository {
  findProduct: (productId: string) => Promise<response<Product>>;
  updateStock: (stockTransfer: StockTransfer) => Promise<response<undefined>>;
  createStockTransfer: (
    stockTransfer: StockTransfer,
  ) => Promise<response<StockTransfer>>;
}

export const updateStock = async (
  order: Order,
  repository: Repository,
): Promise<response<undefined>> => {
  const stockTransfersResponse = await generateOrderStocksTransfers(
    order,
    repository.findProduct,
  );
  if (!stockTransfersResponse.success) {
    return stockTransfersResponse;
  }

  const stockTransfers = stockTransfersResponse.data;

  const validateResponse = await validateStockTransfers(
    stockTransfers,
    repository.findProduct,
  );
  if (!validateResponse.success) {
    return validateResponse;
  }
  if (!validateResponse.data) {
    return { success: false, message: "Invalid stock transfers" };
  }

  await Promise.all(
    stockTransfers.map((stockTransfer) =>
      Promise.all([
        repository.createStockTransfer(stockTransfer),
        repository.updateStock(stockTransfer),
      ]),
    ),
  );

  return { success: true, data: undefined };
};
