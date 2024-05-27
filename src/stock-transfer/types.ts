export type StockTransferBase = {
  id: string;
  value: number;
};

export const OrderStockTransfer = "OrderStockTransfer";
export type OrderStockTransferType = typeof OrderStockTransfer;
export type OrderStockTransfer = StockTransferBase & {
  orderItemId: string;
  fromProductId: string;
  type: OrderStockTransferType;
};

export const ProductStockTransfer = "ProductStockTransfer";
export type ProductStockTransferType = typeof ProductStockTransfer;
export type ProductStockTransfer = StockTransferBase & {
  fromProductId: string;
  toProductId: string;
  type: ProductStockTransferType;
};
