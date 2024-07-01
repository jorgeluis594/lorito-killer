export const OrderStockTransferName = "OrderStockTransfer";
export type OrderStockTransferType = typeof OrderStockTransferName;

export const ProductMovementStockTransfer = "ProductMovementStockTransfer";
export type ProductMovementStockTransferType =
  typeof ProductMovementStockTransfer;

export const AdjustmentStockTransfer = "AdjustmentStockTransfer";
export type AdjustmentStockTransferType = typeof AdjustmentStockTransfer;

export type StockTransferType =
  | OrderStockTransferType
  | ProductMovementStockTransferType
  | AdjustmentStockTransferType;

export type StockTransferBase = {
  id: string;
  companyId: string;
  value: number;
  productId: string;
  type:
    | OrderStockTransferType
    | ProductMovementStockTransferType
    | AdjustmentStockTransferType;
  productName: string;
  createdAt: Date;
};

export type OrderStockTransfer = StockTransferBase & {
  orderItemId: string;
  type: OrderStockTransferType;
};

export type ProductMovementStockTransfer = StockTransferBase & {
  fromProductId: string;
  type: ProductMovementStockTransferType;
};

export type TypeAdjustmentStockTransfer = StockTransferBase & {
  batchId: string;
  type: AdjustmentStockTransferType;
};

export type StockTransfer =
  | OrderStockTransfer
  | ProductMovementStockTransfer
  | TypeAdjustmentStockTransfer;
