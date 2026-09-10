import { expect, test, vi } from "vitest";
import { addRound } from "../use-cases/add-round";
import { addOrderItems, findActiveSession, findProductsByIds } from "../db_repository";

vi.mock("../db_repository", () => ({
  findActiveSession: vi.fn(), findProductsByIds: vi.fn(), addOrderItems: vi.fn(),
}));

test("copies server product stations into a mixed round and only changes subsequent rounds", async () => {
  vi.mocked(findActiveSession).mockResolvedValue({ success: true, data: { status: "OPEN", orderId: "order-1", currentRound: 0 } } as never);
  const products = ["KITCHEN", "BAR", null].map((preparationStation, id) => ({ id: String(id), price: 10, name: "Producto", preparationStation }));
  vi.mocked(findProductsByIds).mockResolvedValue({ success: true, data: products } as never);
  vi.mocked(addOrderItems).mockResolvedValue({ success: true, data: undefined });
  const items = products.map((p) => ({ productId: p.id, quantity: 1, preparationStation: "BAR" }));
  expect((await addRound("table-1", "company-1", items)).success).toBe(true);
  expect(findProductsByIds).toHaveBeenCalledWith(["0", "1", "2"], "company-1");
  expect(vi.mocked(addOrderItems).mock.calls[0][2].map((i) => i.preparationStation)).toEqual(["KITCHEN", "BAR", null]);
  products[0].preparationStation = "BAR";
  await addRound("table-1", "company-1", items);
  expect(vi.mocked(addOrderItems).mock.calls[0][2][0].preparationStation).toBe("KITCHEN");
  expect(vi.mocked(addOrderItems).mock.calls[1][2][0].preparationStation).toBe("BAR");
});
