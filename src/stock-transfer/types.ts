export const OrderStockTransferName = "OrderStockTransfer";
export type OrderStockTransferType = typeof OrderStockTransferName;

export const ProductMovementStockTransferName = "ProductMovementStockTransfer";
export type ProductMovementStockTransferType =
  typeof ProductMovementStockTransferName;

export const AdjustmentStockTransfer = "AdjustmentStockTransfer";
export type AdjustmentStockTransferType = typeof AdjustmentStockTransfer;
export type Status = "pending" | "executed" | "rolled_back" | "cancelled";

export type StockTransferType =
  | OrderStockTransferType
  | ProductMovementStockTransferType
  | AdjustmentStockTransferType;

export type StockTransferBase = {
  id: string;
  userId: string;
  userName?: string;
  companyId: string;
  value: number;
  status: Status;
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
  toProductId: string;
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
