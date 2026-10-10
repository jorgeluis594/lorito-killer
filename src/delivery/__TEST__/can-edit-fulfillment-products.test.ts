import { describe, expect, test } from "vitest";
import {
  canEditFulfillmentProducts,
  leavesActiveProducts,
} from "@/delivery/use-cases/can-edit-fulfillment-products";

describe("canEditFulfillmentProducts", () => {
  test("allows a pending delivery without document", () => {
    expect(
      canEditFulfillmentProducts({
        orderType: "DELIVERY",
        deliveryStatus: "PENDING",
        hasDocument: false,
      }),
    ).toBe(true);
  });

  test.for(["DISPATCHED", "DELIVERED", undefined, null] as const)(
    "blocks a delivery in status %s",
    (deliveryStatus) => {
      expect(
        canEditFulfillmentProducts({
          orderType: "DELIVERY",
          deliveryStatus,
          hasDocument: false,
        }),
      ).toBe(false);
    },
  );

  test("blocks any order with a local document", () => {
    expect(
      canEditFulfillmentProducts({
        orderType: "DELIVERY",
        deliveryStatus: "PENDING",
        hasDocument: true,
      }),
    ).toBe(false);
    expect(
      canEditFulfillmentProducts({
        orderType: "TAKE_AWAY",
        deliveryStatus: null,
        hasDocument: true,
      }),
    ).toBe(false);
  });

  test("allows an unpaid take away without document", () => {
    expect(
      canEditFulfillmentProducts({
        orderType: "TAKE_AWAY",
        deliveryStatus: null,
        hasDocument: false,
      }),
    ).toBe(true);
  });
});

describe("leavesActiveProducts", () => {
  test("accepts when some quantity remains", () => {
    expect(leavesActiveProducts([0, 1])).toBe(true);
  });

  test("rejects when nothing remains", () => {
    expect(leavesActiveProducts([0, 0])).toBe(false);
    expect(leavesActiveProducts([])).toBe(false);
  });
});
