import { Prisma } from "@prisma/client";
import { calculateOrderTotals } from "@/order/use-cases/calculate-order-totals";

/**
 * Único punto que recalcula `Order.total`, `netTotal` y `discountAmount` desde
 * los ítems y el envío vigente. Debe llamarse con la orden ya bloqueada, dentro
 * de la transacción que modificó ítems o envío (creación, adiciones, retiros).
 */
export async function recalculateOrderTotals(
  db: Prisma.TransactionClient,
  orderId: string,
) {
  const [items, delivery] = await Promise.all([
    db.orderItem.aggregate({
      where: { orderId },
      _sum: { total: true, netTotal: true, discountAmount: true },
    }),
    db.delivery.findUnique({
      where: { orderId },
      select: { fee: true, cashPaysWith: true },
    }),
  ]);
  const totals = calculateOrderTotals(
    {
      total: items._sum.total ?? 0,
      netTotal: items._sum.netTotal ?? 0,
      discountAmount: items._sum.discountAmount ?? 0,
    },
    delivery?.fee,
  );
  await db.order.update({ where: { id: orderId }, data: totals });
  return { ...totals, cashPaysWith: delivery?.cashPaysWith ?? null };
}
