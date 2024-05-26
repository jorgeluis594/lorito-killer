export type StockTransferBase = {
  id: string;
  value: number;
};

export const OrderStockTransfer = "OrderStockTransfer";
export type OrderStockTransferType = typeof OrderStockTransfer;
export type OrderStockTransfer = StockTransferBase & {
  orderId: string;
  orderItemId: string;
  productId: string;
  type: OrderStockTransferType;
};
