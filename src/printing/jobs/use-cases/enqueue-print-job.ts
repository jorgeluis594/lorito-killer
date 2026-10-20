import prisma from "@/lib/prisma";
import { log } from "@/lib/log";
import {
  createPrintJob,
  findPrintJobsFor,
  updatePendingPrintJobSnapshot,
} from "../db_repository";
import { processPrintJobs } from "../process-print-jobs";
import { getPrintJobStrategy } from "../strategies";
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
  if (active) {
    // La precuenta cambia entre impresiones: el pendiente imprime la foto actual.
    if (active.status === "PENDING") {
      const retarget = active.printerId !== input.printerId;
      await updatePendingPrintJobSnapshot(
        active.id,
        await getPrintJobStrategy(input.sourceType).buildSnapshot(
          prisma(),
          input.companyId,
          input.sourceId,
          { isReprint: active.isReprint },
        ),
        retarget ? input.printerId : undefined,
      );
      if (retarget) dispatch(active.id, input.sourceType);
    }
    return active.id;
  }

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
  dispatch(job.id, input.sourceType);
  return job.id;
}

const dispatch = (jobId: string, sourceType: PrintJobSourceType) =>
  void processPrintJobs().catch((error) =>
    log.warn("print_job_dispatch_failed", { jobId, sourceType, error }),
  );
