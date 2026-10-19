import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findDocument: vi.fn(),
  printerIds: vi.fn(),
  createJob: vi.fn(),
  findJobs: vi.fn(),
  updateTicket: vi.fn(),
  buildSnapshot: vi.fn(),
  process: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/authorization/server", () => ({ getAuthorizedUser: mocks.auth }));
vi.mock("@/document/db_repository", () => ({
  findBillingDocumentFor: mocks.findDocument,
}));
vi.mock("@/printing/clients/db_repository", () => ({
  getCashierPrinterId: mocks.printerIds,
}));
vi.mock("@/printing/jobs/db_repository", () => ({
  createPrintJob: mocks.createJob,
  findPrintJobsFor: mocks.findJobs,
  updatePendingPrintJobSnapshot: mocks.updateTicket,
}));
vi.mock("@/printing/jobs/strategies", () => ({
  getPrintJobStrategy: () => ({ buildSnapshot: mocks.buildSnapshot }),
}));
vi.mock("@/lib/log", () => ({ log: { warn: mocks.warn } }));
vi.mock("@/printing/jobs/process-print-jobs", () => ({
  processPrintJobs: mocks.process,
}));
vi.mock("@/lib/prisma", () => ({ default: () => "db" }));

import { printTaxDocument } from "../actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({
    success: true,
    data: { id: "cashier-1", companyId: "company-1" },
  });
  mocks.findDocument.mockResolvedValue({
    success: true,
    data: { id: "document-1" },
  });
  mocks.process.mockResolvedValue(undefined);
});

describe("printTaxDocument", () => {
  test("asks to open the PDF when there is no cashier printer", async () => {
    mocks.printerIds.mockResolvedValue(null);

    expect(await printTaxDocument("order-1")).toEqual({
      success: true,
      data: { mode: "pdf" },
    });
    expect(mocks.findDocument).toHaveBeenCalledWith("order-1", "company-1");
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  test("queues the document on the cashier printer, as a reprint when it was printed before", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    mocks.findJobs.mockResolvedValue([{ id: "job-0", status: "DELIVERED" }]);
    mocks.createJob.mockResolvedValue({ id: "job-1" });

    expect(await printTaxDocument("order-1")).toEqual({
      success: true,
      data: { mode: "gateway", jobId: "job-1" },
    });
    expect(mocks.findJobs).toHaveBeenCalledWith("TAX_DOCUMENT", "document-1");
    expect(mocks.createJob).toHaveBeenCalledWith("db", {
      companyId: "company-1",
      sourceType: "TAX_DOCUMENT",
      sourceId: "document-1",
      printerId: "printer-1",
      requestedById: "cashier-1",
      isReprint: true,
    });
    expect(mocks.process).toHaveBeenCalled();
  });

  test("returns the pending job with a fresh snapshot instead of queueing another", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    mocks.findJobs.mockResolvedValue([
      { id: "job-0", status: "PENDING", isReprint: true },
    ]);
    mocks.buildSnapshot.mockResolvedValue({ total: 10 });

    expect(await printTaxDocument("order-1")).toEqual({
      success: true,
      data: { mode: "gateway", jobId: "job-0" },
    });
    expect(mocks.buildSnapshot).toHaveBeenCalledWith(
      "db",
      "company-1",
      "document-1",
      { isReprint: true },
    );
    expect(mocks.updateTicket).toHaveBeenCalledWith("job-0", { total: 10 });
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  test("returns the job the printer is processing untouched", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    mocks.findJobs.mockResolvedValue([
      { id: "job-0", status: "PROCESSING", isReprint: false },
    ]);

    expect(await printTaxDocument("order-1")).toEqual({
      success: true,
      data: { mode: "gateway", jobId: "job-0" },
    });
    expect(mocks.buildSnapshot).not.toHaveBeenCalled();
    expect(mocks.updateTicket).not.toHaveBeenCalled();
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  test("reports a failure to queue instead of throwing", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    mocks.findJobs.mockResolvedValue([]);
    mocks.createJob.mockRejectedValue(
      new Error("No se encontró el pedido o el comprobante."),
    );

    expect(await printTaxDocument("order-1")).toEqual({
      success: false,
      message: "No se pudo enviar a la impresora.",
    });
    expect(mocks.warn).toHaveBeenCalled();
  });

  test("returns the job a concurrent request created first", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    mocks.findJobs
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "job-2", status: "PENDING" }]);
    mocks.createJob.mockRejectedValue({ code: "P2002" });

    expect(await printTaxDocument("order-1")).toEqual({
      success: true,
      data: { mode: "gateway", jobId: "job-2" },
    });
  });

  test("rejects an unauthenticated user", async () => {
    mocks.auth.mockResolvedValue({ success: false, message: "No autenticado" });
    expect(await printTaxDocument("order-1")).toMatchObject({
      success: false,
    });
    expect(mocks.findDocument).not.toHaveBeenCalled();
  });
});
