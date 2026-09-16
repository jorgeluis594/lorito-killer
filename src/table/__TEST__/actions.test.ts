import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
  findExistingOrderRound: vi.fn(),
  submitOrderRound: vi.fn(),
  updateTableDraft: vi.fn(),
}));

vi.mock("@/authorization/server", () => ({
  protectedAction: (_guard: unknown, action: Function) =>
    (...args: unknown[]) =>
      action(
        {
          id: "user-1",
          name: "Mozo",
          email: "waiter@example.com",
          companyId: "company-1",
          role: "WAITER",
          active: true,
        },
        ...args,
      ),
}));
vi.mock("@/feature-flags/server", () => ({
  requireFeature: vi.fn().mockResolvedValue({ success: true, data: true }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/realtime/broadcast", () => ({ broadcast: mocks.broadcast }));
vi.mock("../draft-repository", () => ({
  openTableForService: vi.fn(),
  updateTableDraft: mocks.updateTableDraft,
}));
vi.mock("@/order/rounds/db_repository", () => ({
  findExistingOrderRound: mocks.findExistingOrderRound,
  submitOrderRound: mocks.submitOrderRound,
  findOrderRounds: vi.fn(),
  persistRoundItemCancellation: vi.fn(),
}));

import { sendTableDraft } from "../actions";

const sessionId = "550e8400-e29b-41d4-a716-446655440001";
const roundId = "550e8400-e29b-41d4-a716-446655440000";
const result = {
  orderId: "order-1",
  roundId,
  number: 3,
  tableId: "table-1",
  printJobIds: ["job-1"],
};

describe("sendTableDraft", () => {
  test("returns a confirmed round without reading or submitting the draft", async () => {
    mocks.findExistingOrderRound.mockResolvedValue(result);

    await expect(sendTableDraft(sessionId, 8, roundId)).resolves.toEqual({
      success: true,
      data: result,
    });
    expect(mocks.findExistingOrderRound).toHaveBeenCalledWith({
      roundId,
      companyId: "company-1",
      sessionId,
    });
    expect(mocks.updateTableDraft).not.toHaveBeenCalled();
    expect(mocks.submitOrderRound).not.toHaveBeenCalled();
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });

  test("keeps the normal draft submission flow", async () => {
    mocks.findExistingOrderRound.mockResolvedValue(null);
    mocks.updateTableDraft.mockResolvedValue({
      success: true,
      data: { tableId: "table-1", revision: 8, items: [] },
    });
    mocks.submitOrderRound.mockResolvedValue({ success: true, data: result });

    await expect(sendTableDraft(sessionId, 8, roundId)).resolves.toEqual({
      success: true,
      data: result,
    });
    expect(mocks.updateTableDraft).toHaveBeenCalledOnce();
    expect(mocks.submitOrderRound).toHaveBeenCalledOnce();
  });
});
