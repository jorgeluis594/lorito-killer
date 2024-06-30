export const OrderStockTransferName = "OrderStockTransfer";
export type OrderStockTransferType = typeof OrderStockTransferName;

export const ProductStockTransfer = "ProductStockTransfer";
export type ProductStockTransferType = typeof ProductStockTransfer;

export const AdjustmentStockTransfer = "AdjustmentStockTransfer";
export type AdjustmentStockTransferType = typeof AdjustmentStockTransfer;

export type StockTransferType =
  | OrderStockTransferType
  | ProductStockTransferType;

export type StockTransferBase = {
  id: string;
  companyId: string;
  value: number;
  productId: string;
  type:
    | OrderStockTransferType
    | ProductStockTransferType
    | AdjustmentStockTransferType;
  productName: string;
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

export type TypeAdjustmentStockTransfer = StockTransferBase & {
  batchId?: string;
  type: AdjustmentStockTransferType;
};

export type StockTransfer =
  | OrderStockTransfer
  | ProductStockTransfer
  | TypeAdjustmentStockTransfer;
