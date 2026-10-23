import {
  describeServiceOrder,
  type ServiceOrderIdentity,
} from "@/delivery/use-cases/describe-service-order";

/** Línea del pedido en la comanda: la mesa, o el nombre / la hora de apertura sin mesa. */
export function kitchenTicketOrderLabel(input: {
  table: { label: string | null; number: number } | null;
  identity: ServiceOrderIdentity | null;
}): string {
  if (input.table) return input.table.label || String(input.table.number);
  return input.identity ? describeServiceOrder(input.identity).ticketLabel : "";
}
