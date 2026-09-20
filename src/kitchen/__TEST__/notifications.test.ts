import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  broadcast: vi.fn(),
  findAudience: vi.fn(),
}));

vi.mock("@/lib/realtime/broadcast", () => ({ broadcast: mocks.broadcast }));
vi.mock("../db_repository", () => ({
  findPrintJobFailureAudience: mocks.findAudience,
}));

import { notifyPrintJobFailed } from "../notifications";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.broadcast.mockResolvedValue(undefined);
});

describe("notifyPrintJobFailed", () => {
  test("signals only the admin and responsible channels without job data", async () => {
    mocks.findAudience.mockResolvedValue({
      companyId: "company-1",
      kitchenTicket: { orderRound: { responsibleUserId: "waiter-1" } },
    });

    await notifyPrintJobFailed("job-1");

    expect(mocks.broadcast.mock.calls).toEqual([
      ["company-1", "kitchen-admin", "print-job-failed", {}],
      ["company-1", "kitchen-user-waiter-1", "print-job-failed", {}],
    ]);
  });
});
