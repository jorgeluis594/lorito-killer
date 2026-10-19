"use server";

import { getAuthorizedUser } from "@/authorization/server";
import { findBillingDocumentFor } from "@/document/db_repository";
import type { response } from "@/lib/types";
import { getCompanyPrinterIds } from "@/printing/clients/db_repository";
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
  const { cashier } = await getCompanyPrinterIds(companyId);
  if (!cashier) return { success: true, data: { mode: "pdf" } };

  const jobId = await enqueuePrintJob({
    companyId,
    sourceType: "TAX_DOCUMENT",
    sourceId: document.data.id,
    printerId: cashier,
    requestedById: userId,
  });
  return { success: true, data: { mode: "gateway", jobId } };
}
