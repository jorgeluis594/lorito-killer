import type { TableSession } from "@/table/types";

export type ServiceStage =
  | "EMPTY"
  | "PREPARING"
  | "ON_THE_WAY"
  | "READY"
  | "DELIVERED";

export type ServiceAction = "TAKE_ORDER" | "DISPATCH" | "DELIVER" | "CHARGE";

/**
 * Estado y única acción principal de un delivery o pedido para llevar.
 * Para llevar no se despacha: cobrado, queda listo y se entrega al recogerlo.
 */
export function describeServiceSession(
  session: Pick<TableSession, "delivery" | "paymentStatus" | "order">,
): { stage: ServiceStage; action: ServiceAction } {
  const paid = session.paymentStatus === "PAID";
  const hasItems = !!session.order?.orderItems.some(
    (item) => item.quantity > 0,
  );
  const delivery = session.delivery;
  if (!delivery) {
    if (paid) return { stage: "READY", action: "DELIVER" };
    return hasItems
      ? { stage: "PREPARING", action: "CHARGE" }
      : { stage: "EMPTY", action: "TAKE_ORDER" };
  }
  if (delivery.status === "DELIVERED")
    return { stage: "DELIVERED", action: "CHARGE" };
  if (delivery.status === "DISPATCHED")
    return { stage: "ON_THE_WAY", action: "DELIVER" };
  return hasItems
    ? { stage: "PREPARING", action: "DISPATCH" }
    : { stage: "EMPTY", action: "TAKE_ORDER" };
}

const RANK: Record<ServiceStage, number> = {
  EMPTY: 0,
  PREPARING: 0,
  READY: 1,
  ON_THE_WAY: 1,
  DELIVERED: 2,
};

/** Primero lo que pide acción (por despachar, en camino, sin cobrar); luego antigüedad. */
export function sortServiceSessions<
  T extends Parameters<typeof describeServiceSession>[0] & { openedAt: Date },
>(sessions: T[]): T[] {
  return [...sessions].sort(
    (a, b) =>
      RANK[describeServiceSession(a).stage] -
        RANK[describeServiceSession(b).stage] ||
      new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime(),
  );
}
