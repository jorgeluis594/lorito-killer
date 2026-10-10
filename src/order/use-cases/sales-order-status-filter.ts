import type { Prisma } from "@prisma/client";

export type SalesOrderStatus = "paid" | "cancelled" | "all";
export type SalesDateRange = { gte?: Date; lte?: Date };

// Una venta cuenta cuando está cobrada, no cuando se completa la entrega:
// un Delivery cobrado y despachado sigue PENDING pero ya entró a caja.
// COMPLETED se conserva como cobrada porque hay órdenes históricas completadas
// cuyo paymentStatus quedó en PENDING (sin filas Payment) y no deben salir de
// los reportes ni de la exportación fiscal.
const paidOrder: Prisma.OrderWhereInput = {
  status: { not: "CANCELLED" },
  OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
};

// Fecha de la venta: la del cobro. Las órdenes sin pagos (históricas) caen en
// la fecha de creación. En retail ambas coinciden.
export function saleDateFilter(range: SalesDateRange): Prisma.OrderWhereInput {
  return {
    OR: [
      { payments: { some: { createdAt: range } } },
      { payments: { none: {} }, createdAt: range },
    ],
  };
}

export function salesOrderStatusFilter(
  status: SalesOrderStatus | undefined,
  range?: SalesDateRange,
): Prisma.OrderWhereInput {
  const paid: Prisma.OrderWhereInput = range
    ? { AND: [paidOrder, saleDateFilter(range)] }
    : paidOrder;
  const cancelled: Prisma.OrderWhereInput = {
    status: "CANCELLED",
    ...(range ? { createdAt: range } : {}),
  };
  if (status === "paid") return paid;
  if (status === "cancelled") return cancelled;
  if (status === "all") return { OR: [paid, cancelled] };
  return range ? { createdAt: range } : {};
}
