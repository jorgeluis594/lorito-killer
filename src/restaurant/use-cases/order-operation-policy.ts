export type RestaurantFinancialBlock =
  | { kind: "ORDER_COMPLETED"; message: string }
  | { kind: "HAS_PAYMENTS"; message: string }
  | { kind: "HAS_DOCUMENTS"; message: string };

export type OrderOperationPolicyInput = {
  sessionStatus: "OPEN" | "BILL_REQUESTED" | "CLOSED" | "CANCELLED";
  orderStatus: "PENDING" | "COMPLETED" | "CANCELLED";
  activeItemCount: number;
  paymentCount: number;
  documentCount: number;
};

export type OrderOperationPolicy = {
  financialBlock: RestaurantFinancialBlock | null;
  canModifyOrder: boolean;
  canRequestBill: boolean;
  canCancel: boolean;
  canTransfer: boolean;
  canCheckout: boolean;
  canReopen: boolean;
};

export function getRestaurantFinancialBlock(
  input: Pick<
    OrderOperationPolicyInput,
    "orderStatus" | "paymentCount" | "documentCount"
  >,
): RestaurantFinancialBlock | null {
  if (input.orderStatus === "COMPLETED") {
    return {
      kind: "ORDER_COMPLETED",
      message: "La venta ya fue completada y solo puede revisarse.",
    };
  }
  if (input.paymentCount > 0) {
    return {
      kind: "HAS_PAYMENTS",
      message: "La venta tiene pagos registrados y solo puede revisarse.",
    };
  }
  if (input.documentCount > 0) {
    return {
      kind: "HAS_DOCUMENTS",
      message: "La venta tiene un comprobante registrado y solo puede revisarse.",
    };
  }
  return null;
}

export function getOrderOperationPolicy(
  input: OrderOperationPolicyInput,
): OrderOperationPolicy {
  const financialBlock = getRestaurantFinancialBlock(input);
  const pending = input.orderStatus === "PENDING";
  const open = input.sessionStatus === "OPEN";
  const billRequested = input.sessionStatus === "BILL_REQUESTED";
  const operational = pending && !financialBlock;

  return {
    financialBlock,
    canModifyOrder: operational && open,
    canRequestBill: operational && open && input.activeItemCount > 0,
    canCancel: operational && (open || billRequested),
    canTransfer: operational && (open || billRequested),
    canCheckout: operational && billRequested && input.activeItemCount > 0,
    canReopen: operational && billRequested,
  };
}
