import { describe, expect, test } from "vitest";
import { buildDocumentLines } from "../document-lines";
import type { OrderItem } from "@/order/types";

const item = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: "item-1",
  productId: "product-1",
  productSku: "SKU",
  productName: "Lomo",
  productPrice: 25,
  quantity: 2,
  unitType: "unit",
  netTotal: 50,
  discountAmount: 0,
  total: 50,
  ...overrides,
});

describe("buildDocumentLines", () => {
  test("agrega una única línea Envío (ZZ) al final cuando el envío es mayor que cero", () => {
    const lines = buildDocumentLines({
      orderItems: [item()],
      deliveryFee: 5,
    });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ kind: "product", unit: "NIU", total: 50 });
    expect(lines[1]).toEqual({
      kind: "shipping",
      id: "shipping",
      name: "Envío",
      quantity: 1,
      unit: "ZZ",
      unitType: "unit",
      unitPrice: 5,
      netTotal: 5,
      discountAmount: 0,
      total: 5,
    });
    expect(lines[1].productId).toBeUndefined();
  });

  test.each([0, undefined, -1])(
    "no agrega línea de envío cuando el envío es %s",
    (deliveryFee) => {
      const lines = buildDocumentLines({
        orderItems: [item()],
        deliveryFee,
      });
      expect(lines.map((line) => line.kind)).toEqual(["product"]);
    },
  );

  test("no modifica la lista de productos del inventario", () => {
    const orderItems = [item()];
    buildDocumentLines({ orderItems, deliveryFee: 5 });
    expect(orderItems).toHaveLength(1);
  });

  test("la suma de líneas coincide con productos más envío", () => {
    const lines = buildDocumentLines({
      orderItems: [item(), item({ id: "item-2", netTotal: 20, total: 20 })],
      deliveryFee: 5,
    });
    expect(lines.reduce((sum, line) => sum + line.total, 0)).toBe(75);
  });
});
