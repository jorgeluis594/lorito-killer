"use server";

import { getAuthorizedUser } from "@/authorization/server";
import { findBillingDocumentFor } from "@/document/db_repository";
import { log } from "@/lib/log";
import type { response } from "@/lib/types";
import { getCashierPrinterId } from "@/printing/clients/db_repository";
import { enqueuePrintJob } from "@/printing/jobs/use-cases/enqueue-print-job";

/** Encola el comprobante del pedido en la impresora de caja, o pide abrir el PDF si no hay. */
export async function printTaxDocument(
  orderId: string,
): Promise<response<{ mode: "pdf" } | { mode: "gateway"; jobId: string }>> {
  // Mismo permiso que la ruta del PDF: cualquier usuario activo de la empresa.
  const auth = await getAuthorizedUser();
  if (!auth.success) return auth;
  const { companyId, id: userId } = auth.data;

  const document = await findBillingDocumentFor(orderId, companyId);
  if (!document.success) return document;
  const cashier = await getCashierPrinterId(companyId);
  if (!cashier) return { success: true, data: { mode: "pdf" } };

  try {
    const jobId = await enqueuePrintJob({
      companyId,
      sourceType: "TAX_DOCUMENT",
      sourceId: document.data.id,
      printerId: cashier,
      requestedById: userId,
    });
    return { success: true, data: { mode: "gateway", jobId } };
  } catch (error) {
    log.warn("tax_document_print_enqueue_failed", { orderId, error });
    return { success: false, message: "No se pudo enviar a la impresora." };
  }
}
