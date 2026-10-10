import { describe, expect, test } from "vitest";
import {
  saleDateFilter,
  salesOrderStatusFilter,
} from "@/order/use-cases/sales-order-status-filter";

const paid = {
  status: { not: "CANCELLED" },
  OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
};
const range = { gte: new Date("2026-10-09"), lte: new Date("2026-10-10") };

describe("salesOrderStatusFilter", () => {
  test("paid cuenta cobradas y conserva COMPLETED histórico", () => {
    expect(salesOrderStatusFilter("paid")).toEqual(paid);
  });

  test("paid con rango ubica la venta por la fecha del cobro", () => {
    expect(salesOrderStatusFilter("paid", range)).toEqual({
      AND: [paid, saleDateFilter(range)],
    });
    expect(saleDateFilter(range)).toEqual({
      OR: [
        { payments: { some: { createdAt: range } } },
        { payments: { none: {} }, createdAt: range },
      ],
    });
  });

  test("cancelled filtra por estado CANCELLED", () => {
    expect(salesOrderStatusFilter("cancelled")).toEqual({
      status: "CANCELLED",
    });
    expect(salesOrderStatusFilter("cancelled", range)).toEqual({
      status: "CANCELLED",
      createdAt: range,
    });
  });

  test("all une cobradas y canceladas", () => {
    expect(salesOrderStatusFilter("all")).toEqual({
      OR: [paid, { status: "CANCELLED" }],
    });
  });

  test("sin estado no restringe", () => {
    expect(salesOrderStatusFilter(undefined)).toEqual({});
  });
});
