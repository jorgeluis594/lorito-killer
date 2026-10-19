import { getCompany } from "@/company/db_repository";
import { findBillingDocumentFor } from "@/document/db_repository";
import { findReceiptPrintOrder } from "@/order/db_repository";
import type { PrintJobStrategy } from "@/printing/jobs/types";
import { printCommandsToEscpos } from "@/printing/print-commands-to-escpos";
import { buildReceiptPrintData } from "@/printing/receipt-builder";
import { buildThermalReceiptCommands } from "@/printing/thermal-receipt-renderer";
import type { ReceiptPrintData } from "@/printing/types";

export const taxDocumentPrintStrategy: PrintJobStrategy<ReceiptPrintData> = {
  maxAttempts: 3,
  async buildSnapshot(db, companyId, sourceId) {
    const { orderId } = await db.document.findFirstOrThrow({
      where: { id: sourceId, companyId },
      select: { orderId: true },
    });
    const [company, order, document] = await Promise.all([
      getCompany(companyId),
      findReceiptPrintOrder(orderId, companyId),
      findBillingDocumentFor(orderId, companyId),
    ]);
    if (!company.success || !order.success || !document.success)
      throw new Error("No se encontró el pedido o el comprobante.");
    return buildReceiptPrintData({
      order: order.data,
      company: company.data,
      document: document.data,
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
