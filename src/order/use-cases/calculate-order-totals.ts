import { Prisma } from "@prisma/client";

type Amount = Prisma.Decimal | number | string;

export type OrderTotals = {
  total: Prisma.Decimal;
  netTotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
};

/**
 * Totales de una orden: ítems + cargo de envío. El envío no es un ítem ni lleva
 * descuento, así que suma a `total` y `netTotal` y deja `discountAmount` igual.
 */
export function calculateOrderTotals(
  items: { total: Amount; netTotal: Amount; discountAmount: Amount },
  deliveryFee?: Amount | null,
): OrderTotals {
  const fee = new Prisma.Decimal(deliveryFee ?? 0);
  return {
    total: new Prisma.Decimal(items.total).add(fee),
    netTotal: new Prisma.Decimal(items.netTotal).add(fee),
    discountAmount: new Prisma.Decimal(items.discountAmount),
  };
}
