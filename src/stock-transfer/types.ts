export const OrderStockTransferName = "OrderStockTransfer";
export type OrderStockTransferType = typeof OrderStockTransferName;

export const ProductStockTransfer = "ProductStockTransfer";
export type ProductStockTransferType = typeof ProductStockTransfer;

export type StockTransferType =
  | OrderStockTransferType
  | ProductStockTransferType;

export type StockTransferBase = {
  id: string;
  companyId: string;
  value: number;
  productId: string;
  type: OrderStockTransferType | ProductStockTransferType;
  createdAt: Date;
};

export type OrderStockTransfer = StockTransferBase & {
  orderItemId: string;
  type: OrderStockTransferType;
};

export type ProductStockTransfer = StockTransferBase & {
  fromProductId: string;
  toProductId: string;
  type: ProductStockTransferType;
};

export type StockTransfer = OrderStockTransfer | ProductStockTransfer;
