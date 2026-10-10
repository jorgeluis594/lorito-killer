import type { Discount, Order, OrderItem } from "@/order/types";

export const SHIPPING_LINE_NAME = "Envío";
export const SHIPPING_UNIT = "ZZ";
export const PRODUCT_UNIT = "NIU";

export type DocumentLine = {
  kind: "product" | "shipping";
  id: string;
  productId?: string;
  sku?: string;
  name: string;
  quantity: number;
  unit: typeof PRODUCT_UNIT | typeof SHIPPING_UNIT;
  unitType: OrderItem["unitType"];
  unitPrice: number;
  netTotal: number;
  discountAmount: number;
  discount?: Discount;
  total: number;
};

type DocumentLinesSource = Pick<Order, "orderItems" | "deliveryFee">;

/**
 * Proyección documental compartida por FactPro, PDF, ticket y térmica.
 * Es independiente de `order.orderItems`, que sigue siendo la fuente del
 * inventario: el envío nunca es un producto ni genera stock.
 */
export const buildDocumentLines = (
  order: DocumentLinesSource,
): DocumentLine[] => {
  const lines: DocumentLine[] = order.orderItems.map((item) => ({
    kind: "product",
    id: item.id,
    productId: item.productId,
    sku: item.productSku,
    name: item.productName,
    quantity: item.quantity,
    unit: PRODUCT_UNIT,
    unitType: item.unitType,
    unitPrice: item.productPrice,
    netTotal: item.netTotal,
    discountAmount: item.discountAmount,
    discount: item.discount,
    total: item.total,
  }));

  if (order.deliveryFee && order.deliveryFee > 0)
    lines.push({
      kind: "shipping",
      id: "shipping",
      name: SHIPPING_LINE_NAME,
      quantity: 1,
      unit: SHIPPING_UNIT,
      unitType: "unit",
      unitPrice: order.deliveryFee,
      netTotal: order.deliveryFee,
      discountAmount: 0,
      total: order.deliveryFee,
    });

  return lines;
};
