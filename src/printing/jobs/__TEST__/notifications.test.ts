import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  broadcast: vi.fn(),
  findSource: vi.fn(),
  ticketFind: vi.fn(),
}));

vi.mock("@/lib/realtime/broadcast", () => ({ broadcast: mocks.broadcast }));
vi.mock("@/lib/prisma", () => ({
  default: () => ({ kitchenTicket: { findUniqueOrThrow: mocks.ticketFind } }),
}));
vi.mock("../db_repository", () => ({ findPrintJobSource: mocks.findSource }));

import { notifyPrintJobFailed } from "../notifications";
import { printJobStrategies } from "../strategies";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.broadcast.mockResolvedValue(undefined);
});

describe("notifyPrintJobFailed", () => {
  test("signals only the kitchen admin and responsible channels without job data", async () => {
    mocks.findSource.mockResolvedValue({
      companyId: "company-1",
      sourceType: "KITCHEN_TICKET",
      sourceId: "ticket-1",
      requestedById: "admin-1",
    });
    mocks.ticketFind.mockResolvedValue({
      orderRound: { responsibleUserId: "waiter-1" },
    });

    await notifyPrintJobFailed("job-1");

    expect(mocks.ticketFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ticket-1" } }),
    );
    expect(mocks.broadcast.mock.calls).toEqual([
      ["company-1", "kitchen-admin", "print-job-failed", {}],
      ["company-1", "kitchen-user-waiter-1", "print-job-failed", {}],
    ]);
  });

  test("broadcasts to the channels the job's strategy returns", async () => {
    const failureAudience = vi
      .fn()
      .mockResolvedValue({ channels: ["print-user-cashier-1"] });
    const original = printJobStrategies.KITCHEN_TICKET!;
    printJobStrategies.KITCHEN_TICKET = { ...original, failureAudience };
    try {
      const job = {
        companyId: "company-1",
        sourceType: "KITCHEN_TICKET",
        sourceId: "ticket-1",
        requestedById: "cashier-1",
      };
      mocks.findSource.mockResolvedValue(job);

      await notifyPrintJobFailed("job-1");

      expect(failureAudience).toHaveBeenCalledWith(job);
      expect(mocks.broadcast.mock.calls).toEqual([
        ["company-1", "print-user-cashier-1", "print-job-failed", {}],
      ]);
    } finally {
      printJobStrategies.KITCHEN_TICKET = original;
    }
  });

  test("ignores a job that no longer exists", async () => {
    mocks.findSource.mockResolvedValue(null);
    await notifyPrintJobFailed("job-1");
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });
});
