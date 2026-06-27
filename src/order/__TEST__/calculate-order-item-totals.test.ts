import { describe, expect, test } from "vitest";
import { UNIT_UNIT_TYPE } from "@/product/types";
import type { OrderItem } from "@/order/types";
import calculateOrderItemTotals from "@/order/use-cases/calculate-order-item-totals";

const createOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: "order-item-1",
  productId: "product-1",
  productName: "Cafe americano",
  productPrice: 12.5,
  quantity: 2,
  unitType: UNIT_UNIT_TYPE,
  netTotal: 0,
  total: 0,
  discountAmount: 0,
  ...overrides,
});

describe("calculateOrderItemTotals", () => {
  test("calculates net total and total when the item has no discount", () => {
    const orderItem = createOrderItem({
      quantity: 3,
      productPrice: 10.5,
      netTotal: 999,
      total: 999,
      discountAmount: 999,
    });

    const result = calculateOrderItemTotals(orderItem);

    expect(result).toEqual({
      success: true,
      data: {
        ...orderItem,
        netTotal: 31.5,
        total: 31.5,
        discountAmount: 0,
      },
    });
  });

  test("subtracts an amount discount from the recalculated net total", () => {
    const orderItem = createOrderItem({
      quantity: 2,
      productPrice: 10,
      discount: {
        type: "amount",
        value: 3.5,
      },
    });

    const result = calculateOrderItemTotals(orderItem);

    expect(result).toEqual({
      success: true,
      data: {
        ...orderItem,
        netTotal: 20,
        discountAmount: 3.5,
        total: 16.5,
      },
    });
  });

  test("applies a percent discount to the recalculated net total", () => {
    const orderItem = createOrderItem({
      quantity: 2,
      productPrice: 15,
      discount: {
        type: "percent",
        value: 10,
      },
    });

    const result = calculateOrderItemTotals(orderItem);

    expect(result).toEqual({
      success: true,
      data: {
        ...orderItem,
        netTotal: 30,
        discountAmount: 3,
        total: 27,
      },
    });
  });

  test("uses decimal-safe multiplication when calculating fractional totals", () => {
    const orderItem = createOrderItem({
      quantity: 0.1,
      productPrice: 0.2,
    });

    const result = calculateOrderItemTotals(orderItem);

    expect(result).toEqual({
      success: true,
      data: {
        ...orderItem,
        netTotal: 0.02,
        total: 0.02,
        discountAmount: 0,
      },
    });
  });

  test("returns a discount error when the discount is greater than the recalculated net total", () => {
    const result = calculateOrderItemTotals(
      createOrderItem({
        quantity: 1,
        productPrice: 4,
        netTotal: 999,
        discount: {
          type: "amount",
          value: 5,
        },
      }),
    );

    expect(result).toEqual({
      success: false,
      message: "El descuento no puede ser mayor al neto total",
    });
  });
});
