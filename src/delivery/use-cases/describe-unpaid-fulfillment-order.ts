export type UnpaidFulfillmentInput = {
  orderType: "TAKE_AWAY" | "DELIVERY";
  customerName: string | null;
  deliveryStatus: "PENDING" | "DISPATCHED" | "DELIVERED" | null;
};

const statusLabels = {
  PENDING: "Pendiente",
  DISPATCHED: "Despachado",
  DELIVERED: "Entregado",
} as const;

export function describeUnpaidFulfillmentOrder(input: UnpaidFulfillmentInput) {
  const name = input.customerName?.trim();
  return {
    customerLabel:
      input.orderType === "DELIVERY" && name ? name : "Para llevar",
    statusLabel: statusLabels[input.deliveryStatus ?? "PENDING"],
  };
}
