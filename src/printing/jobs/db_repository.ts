import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getPrintJobStrategy } from "./strategies";
import type { PrintJob, PrintJobSourceType, PrintJobStatus } from "./types";

const toPrintJob = (job: {
  id: string;
  companyId: string;
  sourceType: PrintJobSourceType;
  sourceId: string;
  printerId: string;
  status: PrintJobStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  claimRequestedAt: Date | null;
  processingStartedAt: Date | null;
  printer: { printClientId: string; localName: string };
}): PrintJob => ({
  id: job.id,
  companyId: job.companyId,
  sourceType: job.sourceType,
  sourceId: job.sourceId,
  printerId: job.printerId,
  printClientId: job.printer.printClientId,
  printerLocalName: job.printer.localName,
  status: job.status,
  attempts: job.attempts,
  nextAttemptAt: job.nextAttemptAt,
  claimRequestedAt: job.claimRequestedAt,
  processingStartedAt: job.processingStartedAt,
});

const printJobInclude = {
  printer: { select: { printClientId: true, localName: true } },
} satisfies Prisma.PrintJobInclude;

/** Genera los bytes al tomar el trabajo, fuera de la transacción que creó el pedido. */
export async function renderPrintJobContent(
  jobId: string,
): Promise<Uint8Array> {
  const job = await prisma().printJob.findUniqueOrThrow({
    where: { id: jobId },
    select: { content: true, snapshot: true, sourceType: true, printer: true },
  });
  // Trabajos creados antes del snapshot ya traen sus bytes.
  if (job.content) return job.content;
  return getPrintJobStrategy(job.sourceType).render(job.snapshot, job.printer);
}

/** Usa el snapshot recibido o lo arma con la estrategia del origen. */
export async function createPrintJob(
  db: Prisma.TransactionClient,
  {
    isReprint = false,
    snapshot,
    ...data
  }: {
    id?: string;
    companyId: string;
    sourceType: PrintJobSourceType;
    sourceId: string;
    printerId: string;
    requestedById: string;
    isReprint?: boolean;
    snapshot?: Prisma.InputJsonValue;
  },
) {
  return db.printJob.create({
    data: {
      ...data,
      isReprint,
      snapshot:
        snapshot ??
        (await getPrintJobStrategy(data.sourceType).buildSnapshot(
          db,
          data.companyId,
          data.sourceId,
          { isReprint },
        )),
    },
  });
}

export const findPrintJob = async (jobId: string): Promise<PrintJob | null> => {
  const job = await prisma().printJob.findUnique({
    where: { id: jobId },
    include: printJobInclude,
  });
  return job ? toPrintJob(job) : null;
};

export const authorizePrintJob = async (input: {
  jobId: string;
  clientId: string;
  expectedClaimRequestedAt: Date;
  now: Date;
}): Promise<PrintJob | null> => {
  const changed = await prisma().printJob.updateMany({
    where: {
      id: input.jobId,
      status: "PENDING",
      claimRequestedAt: input.expectedClaimRequestedAt,
      printer: {
        printClientId: input.clientId,
        printClient: { revokedAt: null },
      },
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      nextAttemptAt: null,
      claimRequestedAt: null,
      processingStartedAt: input.now,
      lastError: null,
    },
  });
  return changed.count === 1 ? findPrintJob(input.jobId) : null;
};

export const recordPrintJobResult = async (input: {
  jobId: string;
  clientId: string;
  attemptNumber: number;
  status: "PENDING" | "DELIVERED" | "FAILED";
  nextAttemptAt: Date | null;
  error: string | null;
}): Promise<PrintJob | null> => {
  const changed = await prisma().printJob.updateMany({
    where: {
      id: input.jobId,
      status: "PROCESSING",
      attempts: input.attemptNumber,
      printer: {
        printClientId: input.clientId,
        printClient: { revokedAt: null },
      },
    },
    data: {
      status: input.status,
      nextAttemptAt: input.nextAttemptAt,
      claimRequestedAt: null,
      processingStartedAt: null,
      lastError: input.error,
    },
  });
  return changed.count === 1 ? findPrintJob(input.jobId) : null;
};

export const failTimedOutPrintJob = async (input: {
  jobId: string;
  status: PrintJobStatus;
  observedAt: Date;
  error: string;
}): Promise<PrintJob | null> => {
  const dateField =
    input.status === "PENDING"
      ? { claimRequestedAt: input.observedAt }
      : { processingStartedAt: input.observedAt };
  const changed = await prisma().printJob.updateMany({
    where: { id: input.jobId, status: input.status, ...dateField },
    data: {
      status: "FAILED",
      nextAttemptAt: null,
      claimRequestedAt: null,
      processingStartedAt: null,
      lastError: input.error,
    },
  });
  return changed.count === 1 ? findPrintJob(input.jobId) : null;
};

/** Un render que falla no se arregla reintentando: el trabajo falla con el motivo real. */
export const failUnrenderablePrintJob = async (input: {
  jobId: string;
  clientId: string;
  error: string;
}): Promise<boolean> => {
  const changed = await prisma().printJob.updateMany({
    where: {
      id: input.jobId,
      status: { in: ["PENDING", "PROCESSING"] },
      printer: { printClientId: input.clientId },
    },
    data: {
      status: "FAILED",
      nextAttemptAt: null,
      claimRequestedAt: null,
      processingStartedAt: null,
      lastError: input.error,
    },
  });
  return changed.count === 1;
};

export const failRevokedPrintJobs = async (now: Date): Promise<string[]> => {
  const jobs = await prisma().$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "KitchetTicketPrintJob" job
    SET status = 'FAILED', "claimRequestedAt" = NULL,
        "processingStartedAt" = NULL, "nextAttemptAt" = NULL,
        "lastError" = 'El cliente de impresión fue revocado', "updatedAt" = ${now}
    FROM "Printer" printer
    JOIN "PrintClient" client ON client.id = printer."printClientId"
    WHERE job."printerId" = printer.id
      AND job.status = 'PENDING' AND client."revokedAt" IS NOT NULL
    RETURNING job.id
  `);
  return jobs.map((job) => job.id);
};

type ReservedJob = {
  id: string;
  companyId: string;
  printClientId: string;
};

export const reserveDuePrintJobs = (now: Date): Promise<ReservedJob[]> =>
  prisma().$queryRaw<ReservedJob[]>(Prisma.sql`
    WITH candidates AS (
      SELECT job.id
      FROM "KitchetTicketPrintJob" job
      WHERE job.status = 'PENDING'
        AND job."claimRequestedAt" IS NULL
        AND (job."nextAttemptAt" IS NULL OR job."nextAttemptAt" <= ${now})
        AND EXISTS (
          SELECT 1 FROM "Printer" printer
          JOIN "PrintClient" client ON client.id = printer."printClientId"
          WHERE printer.id = job."printerId" AND client."revokedAt" IS NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM "KitchetTicketPrintJob" active
          WHERE active."printerId" = job."printerId"
            AND (active.status = 'PROCESSING'
              OR (active.status = 'PENDING' AND active."claimRequestedAt" IS NOT NULL))
        )
        AND NOT EXISTS (
          SELECT 1 FROM "KitchetTicketPrintJob" older
          WHERE older."printerId" = job."printerId"
            AND older.status = 'PENDING'
            AND older."claimRequestedAt" IS NULL
            AND (older."nextAttemptAt" IS NULL OR older."nextAttemptAt" <= ${now})
            AND (older."createdAt", older.id) < (job."createdAt", job.id)
        )
      ORDER BY job."createdAt", job.id
      FOR UPDATE OF job SKIP LOCKED
    ), reserved AS (
      UPDATE "KitchetTicketPrintJob" job
      SET "claimRequestedAt" = ${now}, "updatedAt" = ${now}
      FROM candidates
      WHERE job.id = candidates.id AND job."claimRequestedAt" IS NULL
      RETURNING job.id, job."companyId", job."printerId"
    )
    SELECT reserved.id, reserved."companyId", printer."printClientId"
    FROM reserved
    JOIN "Printer" printer ON printer.id = reserved."printerId"
    JOIN "PrintClient" client ON client.id = printer."printClientId"
    WHERE client."revokedAt" IS NULL
  `);

export const findPrintJobTimeouts = (cutoff: Date) =>
  prisma().printJob.findMany({
    where: {
      OR: [
        { status: "PENDING", claimRequestedAt: { lte: cutoff } },
        { status: "PROCESSING", processingStartedAt: { lte: cutoff } },
      ],
    },
    select: {
      id: true,
      status: true,
      claimRequestedAt: true,
      processingStartedAt: true,
    },
  });

export const findAnnouncedPrintJobs = (cutoff: Date) =>
  prisma().printJob.findMany({
    where: {
      status: "PENDING",
      claimRequestedAt: { gt: cutoff },
      printer: { printClient: { revokedAt: null } },
    },
    select: {
      id: true,
      printer: { select: { printClientId: true } },
    },
  });

export const findPrintJobSource = (jobId: string) =>
  prisma().printJob.findUnique({
    where: { id: jobId },
    select: {
      companyId: true,
      sourceType: true,
      sourceId: true,
      requestedById: true,
      lastError: true,
    },
  });

export const findPrintJobsFor = (
  sourceType: PrintJobSourceType,
  sourceId: string,
) =>
  prisma().printJob.findMany({
    where: { sourceType, sourceId },
    select: { id: true, status: true, isReprint: true, printerId: true },
  });

/** Cambia el snapshot solo si la impresora aún no tomó el trabajo. */
export const updatePendingPrintJobSnapshot = (
  jobId: string,
  snapshot: Prisma.InputJsonValue,
  retargetPrinterId?: string,
) =>
  prisma().printJob.updateMany({
    where: { id: jobId, status: "PENDING" },
    // Cambió la impresora de caja: el aviso a la anterior ya no vale y la espera se reinicia.
    data: retargetPrinterId
      ? {
          snapshot,
          printerId: retargetPrinterId,
          claimRequestedAt: null,
          nextAttemptAt: null,
        }
      : { snapshot },
  });
