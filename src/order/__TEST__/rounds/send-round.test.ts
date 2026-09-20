import { describe, expect, test, vi } from "vitest";
import { DishProductType, ServiceProductType } from "@/product/types";
import {
  sendRound,
  type SendRoundDependencies,
} from "../../rounds/use-cases/send-round";

const input = {
  companyId: "company-1",
  orderId: "order-1",
  roundId: "round-1",
  requestHash: "hash-1",
  items: [
    { productId: "dish", quantity: 2, notes: "sin cebolla" },
    { productId: "dish", quantity: 1, notes: "término medio" },
    { productId: "service", quantity: 1 },
    { productId: "service", quantity: 2 },
  ],
};

const result = {
  orderId: "order-1",
  roundId: "round-1",
  number: 1,
  tableId: "table-1",
  printJobIds: [],
};

function dependencies(): SendRoundDependencies {
  return {
    findExisting: vi.fn().mockResolvedValue(null),
    findProducts: vi.fn().mockResolvedValue([
      {
        id: "dish",
        name: "Lomo",
        price: 25,
        type: DishProductType,
        kitchenId: "kitchen-1",
      },
      {
        id: "service",
        name: "Cubierto",
        price: 2,
        type: ServiceProductType,
        kitchenId: null,
      },
    ]),
    persist: vi.fn().mockResolvedValue(result),
  };
}

describe("sendRound", () => {
  test("keeps repeated dishes separate and groups other products in this round", async () => {
    const deps = dependencies();
    const response = await sendRound(input, deps);

    expect(response).toEqual({ success: true, data: result });
    expect(deps.persist).toHaveBeenCalledWith([
      expect.objectContaining({
        productId: "dish",
        quantity: 2,
        notes: "sin cebolla",
      }),
      expect.objectContaining({
        productId: "dish",
        quantity: 1,
        notes: "término medio",
      }),
      expect.objectContaining({ productId: "service", quantity: 3 }),
    ]);
  });

  test("returns an identical retry without persisting again", async () => {
    const deps = dependencies();
    vi.mocked(deps.findExisting).mockResolvedValue({
      orderId: input.orderId,
      requestHash: input.requestHash,
      result,
    });

    expect(await sendRound(input, deps)).toEqual({
      success: true,
      data: result,
    });
    expect(deps.findProducts).not.toHaveBeenCalled();
    expect(deps.persist).not.toHaveBeenCalled();
  });

  test("rejects reuse of a round id with different content", async () => {
    const deps = dependencies();
    vi.mocked(deps.findExisting).mockResolvedValue({
      orderId: input.orderId,
      requestHash: "other",
      result,
    });

    expect((await sendRound(input, deps)).success).toBe(false);
    expect(deps.persist).not.toHaveBeenCalled();
  });
});
