import { describe, expect, test } from "vitest";
import { getOrderOperationPolicy } from "../use-cases/order-operation-policy";

const openOrder = {
  sessionStatus: "OPEN" as const,
  orderStatus: "PENDING" as const,
  activeItemCount: 1,
  paymentCount: 0,
  documentCount: 0,
};

describe("getOrderOperationPolicy", () => {
  test("allows normal open-order operations with active items", () => {
    expect(getOrderOperationPolicy(openOrder)).toMatchObject({
      financialBlock: null,
      canModifyOrder: true,
      canRequestBill: true,
      canCancel: true,
      canTransfer: true,
      canCheckout: false,
      canReopen: false,
    });
  });

  test("requires an active item to request the bill", () => {
    const policy = getOrderOperationPolicy({ ...openOrder, activeItemCount: 0 });
    expect(policy.canModifyOrder).toBe(true);
    expect(policy.canRequestBill).toBe(false);
  });

  test.for([
    { changes: { orderStatus: "COMPLETED" as const, paymentCount: 1, documentCount: 1 }, kind: "ORDER_COMPLETED" },
    { changes: { paymentCount: 1, documentCount: 1 }, kind: "HAS_PAYMENTS" },
    { changes: { documentCount: 1 }, kind: "HAS_DOCUMENTS" },
  ])("prioritizes $kind and disables mutations", ({ changes, kind }) => {
    const policy = getOrderOperationPolicy({ ...openOrder, ...changes });
    expect(policy.financialBlock?.kind).toBe(kind);
    expect(policy.canModifyOrder).toBe(false);
    expect(policy.canRequestBill).toBe(false);
    expect(policy.canCancel).toBe(false);
    expect(policy.canTransfer).toBe(false);
    expect(policy.canCheckout).toBe(false);
    expect(policy.canReopen).toBe(false);
  });

  test("allows checkout and reopen only for an unblocked requested bill", () => {
    const policy = getOrderOperationPolicy({
      ...openOrder,
      sessionStatus: "BILL_REQUESTED",
    });
    expect(policy.canCheckout).toBe(true);
    expect(policy.canReopen).toBe(true);
    expect(policy.canModifyOrder).toBe(false);
  });
});
