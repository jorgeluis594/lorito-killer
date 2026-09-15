import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PrintJob, PrintRecoveryPolicy } from "../types";
import { authorizePrintAttempt } from "../use-cases/authorize-print-attempt";
import { recordPrintResult } from "../use-cases/record-print-result";
import { recordPrintTimeout } from "../use-cases/record-print-timeout";

const now = new Date("2026-09-15T12:00:00.000Z");
const policy: PrintRecoveryPolicy = {
  timeoutMs: 10000,
  maxAttempts: 4,
  retryDelaysMs: [5000, 15000, 30000],
};
const job = (overrides: Partial<PrintJob> = {}): PrintJob => ({
  id: "job-1",
  companyId: "company-1",
  kitchenTicketId: "ticket-1",
  printerId: "printer-1",
  printClientId: "client-1",
  printerLocalName: "COCINA",
  content: Uint8Array.from([0, 1, 255]),
  status: "PENDING",
  attempts: 0,
  nextAttemptAt: null,
  claimRequestedAt: new Date(now.getTime() - 1000),
  processingStartedAt: null,
  ...overrides,
});

describe("authorizePrintAttempt", () => {
  test("atomically authorizes attempt one and repeats it without incrementing", async () => {
    const authorize = vi.fn().mockResolvedValue(
      job({
        status: "PROCESSING",
        attempts: 1,
        claimRequestedAt: null,
        processingStartedAt: now,
      }),
    );
    const first = await authorizePrintAttempt(
      { findJob: async () => job(), authorize },
      { jobId: "job-1", clientId: "client-1", companyId: "company-1", now },
      policy,
    );
    expect(first.success && first.data).toMatchObject({
      jobId: "job-1",
      attemptNumber: 1,
      printerLocalName: "COCINA",
    });

    const repeated = await authorizePrintAttempt(
      {
        findJob: async () =>
          job({
            status: "PROCESSING",
            attempts: 1,
            claimRequestedAt: null,
            processingStartedAt: now,
          }),
        authorize,
      },
      { jobId: "job-1", clientId: "client-1", companyId: "company-1", now },
      policy,
    );
    expect(repeated.success && repeated.data.attemptNumber).toBe(1);
    expect(authorize).toHaveBeenCalledTimes(1);
  });

  test("does not disclose another client's job or authorize an expired claim", async () => {
    const authorize = vi.fn();
    expect(
      await authorizePrintAttempt(
        { findJob: async () => job(), authorize },
        { jobId: "job-1", clientId: "other", companyId: "company-1", now },
        policy,
      ),
    ).toEqual({ success: false, message: "Trabajo no disponible" });
    expect(
      await authorizePrintAttempt(
        {
          findJob: async () =>
            job({ claimRequestedAt: new Date(now.getTime() - 10000) }),
          authorize,
        },
        { jobId: "job-1", clientId: "client-1", companyId: "company-1", now },
        policy,
      ),
    ).toEqual({ success: false, message: "Trabajo no disponible" });
    expect(authorize).not.toHaveBeenCalled();
  });
});

describe("recordPrintResult", () => {
  const processing = () =>
    job({
      status: "PROCESSING",
      attempts: 1,
      claimRequestedAt: null,
      processingStartedAt: now,
    });

  test("schedules only a safe failure using the configured delay", async () => {
    const record = vi.fn().mockImplementation(async (input) =>
      job({
        status: input.status,
        attempts: 1,
        nextAttemptAt: input.nextAttemptAt,
      }),
    );
    const result = await recordPrintResult(
      { findJob: async () => processing(), record },
      {
        jobId: "job-1",
        clientId: "client-1",
        companyId: "company-1",
        attemptNumber: 1,
        result: "RETRYABLE_FAILURE",
        now,
      },
      policy,
    );
    expect(result.success && result.data.nextAttemptAt).toEqual(
      new Date(now.getTime() + 5000),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PENDING" }),
    );
  });

  test.each(["DELIVERED", "FAILED"] as const)(
    "%s ends the attempt without a retry",
    async (outcome) => {
      const record = vi
        .fn()
        .mockImplementation(async (input) =>
          job({ status: input.status, attempts: 1 }),
        );
      const result = await recordPrintResult(
        { findJob: async () => processing(), record },
        {
          jobId: "job-1",
          clientId: "client-1",
          companyId: "company-1",
          attemptNumber: 1,
          result: outcome,
          now,
        },
        policy,
      );
      expect(result.success && result.data.status).toBe(outcome);
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ nextAttemptAt: null }),
      );
    },
  );

  test("ignores a repeated applied result and rejects an old attempt", async () => {
    const record = vi.fn();
    const repeated = await recordPrintResult(
      {
        findJob: async () => job({ status: "DELIVERED", attempts: 1 }),
        record,
      },
      {
        jobId: "job-1",
        clientId: "client-1",
        companyId: "company-1",
        attemptNumber: 1,
        result: "DELIVERED",
        now,
      },
      policy,
    );
    expect(repeated.success && repeated.data.applied).toBe(false);
    expect(record).not.toHaveBeenCalled();

    expect(
      await recordPrintResult(
        {
          findJob: async () => job({ status: "PROCESSING", attempts: 2 }),
          record,
        },
        {
          jobId: "job-1",
          clientId: "client-1",
          companyId: "company-1",
          attemptNumber: 1,
          result: "DELIVERED",
          now,
        },
        policy,
      ),
    ).toEqual({ success: false, message: "Intento desactualizado" });
  });
});

describe("recordPrintTimeout", () => {
  test("fails only the same expired persisted window", async () => {
    const failTimedOut = vi.fn().mockResolvedValue(job({ status: "FAILED" }));
    const observedAt = new Date(now.getTime() - 10000);
    const result = await recordPrintTimeout(
      { failTimedOut },
      { jobId: "job-1", status: "PENDING", observedAt, now, timeoutMs: 10000 },
    );
    expect(result.success && result.data?.status).toBe("FAILED");
    expect(failTimedOut).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-1", observedAt }),
    );
  });
});
