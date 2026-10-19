"use server";

import { getAuthorizedUser } from "@/authorization/server";
import { findBillingDocumentFor } from "@/document/db_repository";
import prisma from "@/lib/prisma";
import { log } from "@/lib/log";
import type { response } from "@/lib/types";
import { getCompanyPrinterIds } from "@/printing/clients/db_repository";
import {
  createPrintJob,
  findPrintJobsFor,
} from "@/printing/jobs/db_repository";
import { processPrintJobs } from "@/printing/jobs/process-print-jobs";

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

  const sourceId = document.data.id;
  const jobs = await findPrintJobsFor("TAX_DOCUMENT", sourceId);
  // Un índice único admite un solo trabajo activo por origen: se reusa sin avisar.
  const active = jobs.find(
    (job) => job.status === "PENDING" || job.status === "PROCESSING",
  );
  if (active)
    return { success: true, data: { mode: "gateway", jobId: active.id } };

  let job: { id: string };
  try {
    job = await createPrintJob(prisma(), {
      companyId,
      sourceType: "TAX_DOCUMENT",
      sourceId,
      printerId: cashier,
      requestedById: userId,
      isReprint: jobs.length > 0,
    });
  } catch (error) {
    // Otro pedido de impresión creó el trabajo activo entre la lectura y el insert.
    if ((error as { code?: string }).code !== "P2002") throw error;
    const concurrent = (await findPrintJobsFor("TAX_DOCUMENT", sourceId)).find(
      (job) => job.status === "PENDING" || job.status === "PROCESSING",
    );
    if (!concurrent) throw error;
    return { success: true, data: { mode: "gateway", jobId: concurrent.id } };
  }
  void processPrintJobs().catch((error) =>
    log.warn("tax_document_print_dispatch_failed", { jobId: job.id, error }),
  );
  return { success: true, data: { mode: "gateway", jobId: job.id } };
}
