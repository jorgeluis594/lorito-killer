import { describe, expect, test } from "vitest";
import { canCancelOrder } from "@/order/use-cases/can-cancel-order";

const now = new Date("2026-09-11T12:00:00.000Z");
const eligible = {
  hasPermission: true,
  orderStatus: "completed" as const,
  documentStatus: "registered" as const,
  orderCreatedAt: new Date(now.getTime() - 167 * 60 * 60 * 1000),
  now,
};

describe("canCancelOrder", () => {
  test("allows an eligible sale", () => {
    expect(canCancelOrder(eligible)).toBe(true);
  });

  test.for([
    { name: "without permission", values: { hasPermission: false } },
    { name: "when the order is pending", values: { orderStatus: "pending" } },
    {
      name: "when the document is pending cancellation",
      values: { documentStatus: "pending_cancellation" },
    },
    {
      name: "when the document is cancelled",
      values: { documentStatus: "cancelled" },
    },
    {
      name: "at exactly 168 hours",
      values: {
        orderCreatedAt: new Date(now.getTime() - 168 * 60 * 60 * 1000),
      },
    },
  ] as const)("blocks $name", ({ values }) => {
    expect(canCancelOrder({ ...eligible, ...values })).toBe(false);
  });
});
