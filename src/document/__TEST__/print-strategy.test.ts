import { describe, expect, test } from "vitest";
import { taxDocumentPrintStrategy } from "../print-strategy";
import { getPrintRecoveryPolicy } from "@/printing/jobs/policy";
import type { ReceiptPrintData } from "@/printing/types";

const receipt: ReceiptPrintData = {
  company: { commercialName: "Lorito", legalName: "Lorito SAC", ruc: "20123" },
  document: {
    type: "receipt",
    series: "B001",
    number: "7",
    correlative: "B001-00000007",
    dateOfIssue: "2026-10-19T15:00:00.000Z",
    status: "registered",
    qr: "20123|03|B001|7|0|25.00",
    netTotal: 25,
    discountAmount: 0,
    total: 25,
  },
  order: {
    id: "order-123456789",
    date: "2026-10-19T15:00:00.000Z",
    items: [
      {
        id: "item-1",
        name: "Lomo saltado",
        quantity: 1,
        unitType: "unit",
        unitPrice: 25,
        netTotal: 25,
        discountAmount: 0,
        total: 25,
      },
    ],
    payments: [{ method: "cash", amount: 25 }],
    subtotal: 25,
    discount: 0,
    total: 25,
  },
};

const printer = (columns: number) => ({
  columns,
  codepageMapping: "epson",
  cutEnabled: true,
  feedBeforeCut: 3,
});

// GS ( k: QR nativo de ESC/POS.
const QR_COMMAND = Buffer.from([0x1d, 0x28, 0x6b]);

describe("taxDocumentPrintStrategy", () => {
  test.each([32, 48])(
    "renders the receipt with a native QR at %i columns",
    async (columns) => {
      const bytes = Buffer.from(
        await taxDocumentPrintStrategy.render(receipt, printer(columns)),
      );
      const text = bytes.toString("latin1");
      expect(text).toContain(`\n\r${"=".repeat(columns)}\n\r`);
      expect(text).not.toContain("=".repeat(columns + 1));
      expect(text).toContain("BOLETA ELECTRONICA");
      expect(bytes.indexOf(QR_COMMAND)).toBeGreaterThanOrEqual(0);
      expect(text).toContain(receipt.document.qr);
    },
  );

  test("marks a cancelled document", async () => {
    const text = Buffer.from(
      await taxDocumentPrintStrategy.render(
        {
          ...receipt,
          document: { ...receipt.document, status: "cancelled" },
        },
        printer(32),
      ),
    ).toString("latin1");
    expect(text).toContain("ANULADO");
  });

  test("fails for good on the third attempt", () => {
    expect(getPrintRecoveryPolicy("TAX_DOCUMENT").maxAttempts).toBe(3);
  });

  test("notifies only whoever requested the print", async () => {
    expect(
      await taxDocumentPrintStrategy.failureAudience({
        companyId: "company-1",
        sourceId: "document-1",
        requestedById: "cashier-1",
      }),
    ).toEqual({ channels: ["print-user-cashier-1"] });
  });
});
