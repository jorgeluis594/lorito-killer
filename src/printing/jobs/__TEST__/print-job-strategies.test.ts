import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ jobFindOrThrow: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: () => ({ printJob: { findUniqueOrThrow: mocks.jobFindOrThrow } }),
}));

import { taxDocumentPrintStrategy } from "@/document/print-strategy";
import { kitchenTicketPrintStrategy } from "@/kitchen/print-strategy";
import { renderPrintJobContent } from "../db_repository";
import { getPrintRecoveryPolicy } from "../policy";
import { getPrintJobStrategy } from "../strategies";

const printer = {
  columns: 32,
  codepageMapping: "epson",
  cutEnabled: true,
  feedBeforeCut: 3,
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("printJobStrategies", () => {
  test("returns each type's strategy and rejects a type without one", () => {
    expect(getPrintJobStrategy("KITCHEN_TICKET")).toBe(
      kitchenTicketPrintStrategy,
    );
    expect(getPrintJobStrategy("TAX_DOCUMENT")).toBe(taxDocumentPrintStrategy);
    expect(() => getPrintJobStrategy("PRE_BILL")).toThrow(
      "No hay estrategia de impresión para PRE_BILL",
    );
  });
});

describe("getPrintRecoveryPolicy", () => {
  test("uses the strategy's maxAttempts and falls back to PRINT_JOB_MAX_ATTEMPTS", () => {
    vi.stubEnv("PRINT_JOB_MAX_ATTEMPTS", "5");
    expect(getPrintRecoveryPolicy("TAX_DOCUMENT").maxAttempts).toBe(3);
    expect(getPrintRecoveryPolicy("KITCHEN_TICKET").maxAttempts).toBe(5);
    expect(getPrintRecoveryPolicy().maxAttempts).toBe(5);
  });
});

describe("renderPrintJobContent", () => {
  test("renders the stored snapshot after its JSON round trip", async () => {
    mocks.jobFindOrThrow.mockResolvedValue({
      content: null,
      sourceType: "KITCHEN_TICKET",
      printer,
      ticket: JSON.parse(
        JSON.stringify({
          ticketId: "ticket-1",
          createdAt: new Date("2026-09-15T18:30:00Z"),
          kitchenName: "Cocina",
          orderType: "DINE_IN",
          orderLabel: "7",
          responsibleName: "Ana",
          items: [{ productName: "Lomo", quantity: 2 }],
        }),
      ),
    });
    const content = await renderPrintJobContent("job-1");
    // ESC * 33: la comanda se envía como imagen.
    expect(
      Buffer.from(content).indexOf(Buffer.from([0x1b, 0x2a, 0x21])),
    ).toBeGreaterThanOrEqual(0);
  });

  test("returns legacy bytes before asking any strategy", async () => {
    mocks.jobFindOrThrow.mockResolvedValue({
      content: Uint8Array.from([1, 2]),
      sourceType: "TAX_DOCUMENT",
      ticket: null,
      printer,
    });
    expect(await renderPrintJobContent("job-1")).toEqual(
      Uint8Array.from([1, 2]),
    );
  });
});
