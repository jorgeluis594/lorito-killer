export const OrderStockTransfer = "OrderStockTransfer";
export type OrderStockTransferType = typeof OrderStockTransfer;

export const ProductStockTransfer = "ProductStockTransfer";
export type ProductStockTransferType = typeof ProductStockTransfer;

export type StockUpdate = {
  productId: string;
  quantity: number;
};

export type StockTransfer = {
  id: string;
  value: number;
  productId: string;
  type: OrderStockTransferType | ProductStockTransferType;
};

export type OrderStockTransfer = StockTransfer & {
  orderItemId: string;
  type: OrderStockTransferType;
};

export type ProductStockTransfer = StockTransfer & {
  fromProductId: string;
  toProductId: string;
  type: ProductStockTransferType;
};
