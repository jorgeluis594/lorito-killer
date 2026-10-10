import { describe, expect, test } from "vitest";
import { salesOrderStatusFilter } from "@/order/use-cases/sales-order-status-filter";

describe("salesOrderStatusFilter", () => {
  test("paid usa el cobro y no el estado COMPLETED", () => {
    expect(salesOrderStatusFilter("paid")).toEqual({
      paymentStatus: "PAID",
      status: { not: "CANCELLED" },
    });
  });

  test("cancelled filtra por estado CANCELLED", () => {
    expect(salesOrderStatusFilter("cancelled")).toEqual({
      status: "CANCELLED",
    });
  });

  test("all une cobradas y canceladas", () => {
    expect(salesOrderStatusFilter("all")).toEqual({
      OR: [
        { paymentStatus: "PAID", status: { not: "CANCELLED" } },
        { status: "CANCELLED" },
      ],
    });
  });

  test("sin estado no restringe", () => {
    expect(salesOrderStatusFilter(undefined)).toEqual({});
  });
});
