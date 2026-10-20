import { getCompany } from "@/company/db_repository";
import { prismaDocumentToDocument } from "@/document/db_repository";
import { findReceiptPrintOrder } from "@/order/db_repository";
import type { PrintJobStrategy } from "@/printing/jobs/types";
import { printCommandsToEscpos } from "@/printing/print-commands-to-escpos";
import { buildReceiptPrintData } from "@/printing/receipt-builder";
import { buildThermalReceiptCommands } from "@/printing/thermal-receipt-renderer";
import type { ReceiptPrintData } from "@/printing/types";

export const taxDocumentPrintStrategy: PrintJobStrategy<ReceiptPrintData> = {
  maxAttempts: 3,
  async buildSnapshot(db, companyId, sourceId) {
    const row = await db.document.findFirstOrThrow({
      where: { id: sourceId, companyId },
    });
    const [company, order] = await Promise.all([
      getCompany(companyId),
      findReceiptPrintOrder(row.orderId, companyId),
    ]);
    if (!company.success || !order.success)
      throw new Error("No se encontró el pedido o el comprobante.");
    return buildReceiptPrintData({
      order: order.data,
      company: company.data,
      document: prismaDocumentToDocument(row),
    });
  },
  render: async (receipt, printer) =>
    printCommandsToEscpos(
      buildThermalReceiptCommands(receipt, printer.columns),
      printer,
    ),
  failureAudience: async (job) => ({
    channels: [`print-user-${job.requestedById}`],
  }),
};
