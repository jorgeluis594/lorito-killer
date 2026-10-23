import {
  describeServiceOrder,
  type ServiceOrderIdentity,
} from "./describe-service-order";

export type UnpaidFulfillmentInput = {
  identity: ServiceOrderIdentity;
  deliveryStatus: "PENDING" | "DISPATCHED" | "DELIVERED" | null;
};

const statusLabels = {
  PENDING: "Pendiente",
  DISPATCHED: "Despachado",
  DELIVERED: "Entregado",
} as const;

export function describeUnpaidFulfillmentOrder(input: UnpaidFulfillmentInput) {
  return {
    orderLabel: describeServiceOrder(input.identity).summaryLabel,
    statusLabel: statusLabels[input.deliveryStatus ?? "PENDING"],
  };
}
