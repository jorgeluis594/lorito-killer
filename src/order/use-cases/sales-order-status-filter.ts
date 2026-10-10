import type { Prisma } from "@prisma/client";

export type SalesOrderStatus = "paid" | "cancelled" | "all";

// Una venta cuenta cuando está cobrada, no cuando se completa la entrega:
// un Delivery cobrado y despachado sigue PENDING pero ya entró a caja.
const paidOrder: Prisma.OrderWhereInput = {
  paymentStatus: "PAID",
  status: { not: "CANCELLED" },
};
const cancelledOrder: Prisma.OrderWhereInput = { status: "CANCELLED" };

export function salesOrderStatusFilter(
  status: SalesOrderStatus | undefined,
): Prisma.OrderWhereInput {
  if (status === "paid") return paidOrder;
  if (status === "cancelled") return cancelledOrder;
  if (status === "all") return { OR: [paidOrder, cancelledOrder] };
  return {};
}
