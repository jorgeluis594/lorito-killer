import prisma from "@/lib/prisma";
import { log } from "@/lib/log";
import { createPrintJob, findPrintJobsFor } from "../db_repository";
import { processPrintJobs } from "../process-print-jobs";
import type { PrintJobSourceType } from "../types";

const isActive = (job: { status: string }) =>
  job.status === "PENDING" || job.status === "PROCESSING";

/** Crea el trabajo del origen (reimpresión si ya hubo uno) o devuelve el activo. */
export async function enqueuePrintJob(input: {
  companyId: string;
  sourceType: PrintJobSourceType;
  sourceId: string;
  printerId: string;
  requestedById: string;
}): Promise<string> {
  const jobs = await findPrintJobsFor(input.sourceType, input.sourceId);
  // Un índice único admite un solo trabajo activo por origen: se reusa sin avisar.
  const active = jobs.find(isActive);
  if (active) return active.id;

  let job: { id: string };
  try {
    job = await createPrintJob(prisma(), {
      ...input,
      isReprint: jobs.length > 0,
    });
  } catch (error) {
    // Otro pedido de impresión creó el trabajo activo entre la lectura y el insert.
    if ((error as { code?: string }).code !== "P2002") throw error;
    const concurrent = (
      await findPrintJobsFor(input.sourceType, input.sourceId)
    ).find(isActive);
    if (!concurrent) throw error;
    return concurrent.id;
  }
  void processPrintJobs().catch((error) =>
    log.warn("print_job_dispatch_failed", {
      jobId: job.id,
      sourceType: input.sourceType,
      error,
    }),
  );
  return job.id;
}
