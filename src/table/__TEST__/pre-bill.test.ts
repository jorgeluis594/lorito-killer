import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  printerIds: vi.fn(),
  findSession: vi.fn(),
  findWaiter: vi.fn(),
  enqueue: vi.fn(),
  payTable: vi.fn(),
}));

vi.mock("@/authorization/server", () => ({
  protectedAction:
    (_guard: unknown, action: Function) =>
    (...args: unknown[]) =>
      action(
        { id: "cashier-1", companyId: "company-1", role: "WAITER" },
        ...args,
      ),
}));
vi.mock("@/feature-flags/server", () => ({
  requireFeature: vi.fn().mockResolvedValue({ success: true, data: true }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/realtime/broadcast", () => ({
  broadcast: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/document/tax-dispatch-outbox", () => ({
  enqueueDocumentTaxDispatch: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: () => ({
    tableSession: {
      findFirst: mocks.findSession,
      findUniqueOrThrow: mocks.findWaiter,
    },
  }),
}));
vi.mock("@/printing/clients/db_repository", () => ({
  getCashierPrinterId: mocks.printerIds,
}));
vi.mock("@/printing/jobs/use-cases/enqueue-print-job", () => ({
  enqueuePrintJob: mocks.enqueue,
}));
vi.mock("../payment-schema", () => ({
  TablePaymentSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
}));
vi.mock("../payment-repository", () => ({
  getTablePaymentData: vi.fn(),
  payTable: mocks.payTable,
}));

import type { TablePaymentInput } from "../payment-schema";
import { confirmTablePayment } from "../payment-actions";
import { preBillPrintStrategy, type PreBillSnapshot } from "../print-strategy";
import { printPreBill } from "../use-cases/print-pre-bill";

const sessionId = "61d88b85-e72a-48ed-90a5-7185eb3be5c7";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findSession.mockResolvedValue({ id: sessionId });
  mocks.enqueue.mockResolvedValue("job-1");
});

describe("preBillPrintStrategy.render", () => {
  const preBill: PreBillSnapshot = {
    tableLabel: "7",
    waiterName: "Ana",
    guestCount: 3,
    printedAt: "2026-10-19T20:30:00.000Z",
    items: [
      {
        name: "Lomo saltado",
        quantity: 2,
        unitPrice: 30,
        netTotal: 60,
        discountAmount: 0,
      },
      {
        name: "Chicha",
        quantity: 1,
        unitPrice: 10,
        netTotal: 10,
        discountAmount: 2,
      },
    ],
    subtotal: 70,
    discountAmount: 2,
    total: 68,
  };

  test.each([32, 48])(
    "prints the bill and its legend at %i columns",
    async (columns) => {
      const text = Buffer.from(
        await preBillPrintStrategy.render(preBill, {
          columns,
          codepageMapping: "epson",
          cutEnabled: true,
          feedBeforeCut: 3,
        }),
      ).toString("latin1");
      expect(text).toContain("PRECUENTA");
      expect(text).toContain("Mesa: 7");
      expect(text).toContain("Mozo: Ana");
      expect(text).toContain("Personas: 3");
      expect(text).toContain("Hora: 19/10/2026 03:30 PM");
      expect(text).toContain("2 x Lomo saltado");
      expect(text).toMatch(/Descuento:\s+S\/\s?2\.00/);
      expect(text).toMatch(/Total:\s+S\/\s?68\.00/);
      // Sin negritas ni saltos: la leyenda se parte en 58 mm.
      expect(
        text.replace(/\x1bE[\x00\x01]/g, "").replace(/\s+/g, " "),
      ).toContain("No valido como comprobante de pago");
      expect(text).toContain("=".repeat(columns));
      expect(text).not.toContain("=".repeat(columns + 1));
    },
  );
});

describe("preBillPrintStrategy.failureAudience", () => {
  test("warns whoever asked and the table's waiter once each", async () => {
    mocks.findWaiter.mockResolvedValue({ waiterId: "waiter-1" });
    const job = {
      companyId: "company-1",
      sourceId: sessionId,
      requestedById: "cashier-1",
    };
    expect(await preBillPrintStrategy.failureAudience(job)).toEqual({
      channels: ["print-user-cashier-1", "print-user-waiter-1"],
    });
    mocks.findWaiter.mockResolvedValue({ waiterId: "cashier-1" });
    expect(await preBillPrintStrategy.failureAudience(job)).toEqual({
      channels: ["print-user-cashier-1"],
    });
  });
});

describe("printPreBill", () => {
  test("asks to configure the cashier printer when there is none", async () => {
    mocks.printerIds.mockResolvedValue(null);
    const result = await printPreBill("company-1", "cashier-1", sessionId);
    expect(result).toMatchObject({ success: false });
    expect(!result.success && result.message).toContain("impresora de caja");
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  test("queues the pre-bill of an open table on the cashier printer", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    expect(await printPreBill("company-1", "cashier-1", sessionId)).toEqual({
      success: true,
      data: { jobId: "job-1" },
    });
    expect(mocks.findSession).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: sessionId,
          companyId: "company-1",
          status: { in: ["OPEN", "BILL_REQUESTED"] },
        }),
      }),
    );
    expect(mocks.enqueue).toHaveBeenCalledWith({
      companyId: "company-1",
      sourceType: "PRE_BILL",
      sourceId: sessionId,
      printerId: "printer-1",
      requestedById: "cashier-1",
    });
  });

  test("rejects a session that is not an open table", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    mocks.findSession.mockResolvedValue(null);
    expect(
      await printPreBill("company-1", "cashier-1", sessionId),
    ).toMatchObject({
      success: false,
    });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  test("reports a failure to queue instead of throwing", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    mocks.enqueue.mockRejectedValue(new Error("db down"));
    expect(await printPreBill("company-1", "cashier-1", sessionId)).toEqual({
      success: false,
      message: "No se pudo enviar a la impresora.",
    });
  });
});

describe("confirmTablePayment sending the bill to the register", () => {
  const input = { sessionId, method: "register" } as TablePaymentInput;
  const registered = {
    success: true,
    data: {
      state: "register",
      orderId: "order-1",
      total: 68,
      method: "register",
    },
  };

  beforeEach(() => {
    mocks.payTable.mockResolvedValue(registered);
  });

  test("prints the pre-bill on the cashier printer", async () => {
    mocks.printerIds.mockResolvedValue("printer-1");
    expect(await confirmTablePayment(input)).toEqual(registered);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: "PRE_BILL", sourceId: sessionId }),
    );
  });

  test("still succeeds without a cashier printer or when printing fails", async () => {
    mocks.printerIds.mockResolvedValue(null);
    expect(await confirmTablePayment(input)).toEqual(registered);
    expect(mocks.enqueue).not.toHaveBeenCalled();

    mocks.printerIds.mockResolvedValue("printer-1");
    mocks.enqueue.mockRejectedValue(new Error("db down"));
    expect(await confirmTablePayment(input)).toEqual(registered);
  });

  test("does not print again when the bill was already requested", async () => {
    mocks.payTable.mockResolvedValue({
      success: true,
      data: { ...registered.data, alreadyRequested: true },
    });
    await confirmTablePayment(input);
    expect(mocks.printerIds).not.toHaveBeenCalled();
  });

  test("does not print when the payment is collected", async () => {
    mocks.payTable.mockResolvedValue({
      success: true,
      data: { state: "paid", orderId: "order-1", total: 68, method: "cash" },
    });
    await confirmTablePayment(input);
    expect(mocks.printerIds).not.toHaveBeenCalled();
  });
});
