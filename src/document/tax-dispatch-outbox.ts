import { DocumentTaxDispatchStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { log } from "@/lib/log";
import { sendToTaxEntityJob } from "@/document/jobs";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 12;

const batchSize = Number(
  process.env.DOCUMENT_TAX_DISPATCH_RECONCILE_BATCH_SIZE,
);
const maxAttempts = Number(process.env.DOCUMENT_TAX_DISPATCH_MAX_ATTEMPTS);

export const DOCUMENT_TAX_DISPATCH_BATCH_SIZE =
  Number.isFinite(batchSize) && batchSize > 0
    ? Math.floor(batchSize)
    : DEFAULT_BATCH_SIZE;

export const DOCUMENT_TAX_DISPATCH_MAX_ATTEMPTS =
  Number.isFinite(maxAttempts) && maxAttempts > 0
    ? Math.floor(maxAttempts)
    : DEFAULT_MAX_ATTEMPTS;

function errorMessageFor(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2000);
}

export function documentTaxDispatchJobId(documentId: string) {
  return `${sendToTaxEntityJob.name}:${documentId}`;
}

export async function createPendingDocumentTaxDispatch(
  documentId: string,
  companyId: string,
) {
  return prisma().documentTaxDispatch.upsert({
    where: { documentId },
    create: {
      documentId,
      companyId,
      status: DocumentTaxDispatchStatus.PENDING,
    },
    update: {
      companyId,
      status: DocumentTaxDispatchStatus.PENDING,
      lastError: null,
    },
  });
}

export async function enqueueDocumentTaxDispatch(
  documentId: string,
  companyId: string,
) {
  const jobId = documentTaxDispatchJobId(documentId);

  try {
    await sendToTaxEntityJob.enqueue({ companyId, documentId }, { jobId });
    await prisma().documentTaxDispatch.update({
      where: { documentId },
      data: {
        status: DocumentTaxDispatchStatus.ENQUEUED,
        jobId,
        enqueuedAt: new Date(),
        lastError: null,
      },
    });

    log.info("document_tax_dispatch_enqueued", {
      documentId,
      companyId,
      jobId,
    });

    return { success: true as const };
  } catch (error) {
    const lastError = errorMessageFor(error);

    try {
      await prisma().documentTaxDispatch.update({
        where: { documentId },
        data: {
          status: DocumentTaxDispatchStatus.PENDING,
          jobId,
          lastError,
          attempts: { increment: 1 },
        },
      });
    } catch (updateError) {
      log.error("document_tax_dispatch_enqueue_state_update_failed", {
        documentId,
        companyId,
        jobId,
        enqueueError: lastError,
        updateError: errorMessageFor(updateError),
      });
    }

    log.error("document_tax_dispatch_enqueue_failed", {
      documentId,
      companyId,
      jobId,
      error: lastError,
    });

    return { success: false as const, message: lastError };
  }
}

export async function reconcilePendingDocumentTaxDispatches() {
  const failed = await prisma().documentTaxDispatch.updateMany({
    where: {
      status: DocumentTaxDispatchStatus.PENDING,
      attempts: { gte: DOCUMENT_TAX_DISPATCH_MAX_ATTEMPTS },
    },
    data: {
      status: DocumentTaxDispatchStatus.FAILED,
      lastError: `Exceeded ${DOCUMENT_TAX_DISPATCH_MAX_ATTEMPTS} enqueue attempts`,
    },
  });

  if (failed.count > 0) {
    log.error("document_tax_dispatches_marked_failed", {
      count: failed.count,
      maxAttempts: DOCUMENT_TAX_DISPATCH_MAX_ATTEMPTS,
    });
  }

  const pendingDispatches = await prisma().documentTaxDispatch.findMany({
    where: {
      status: DocumentTaxDispatchStatus.PENDING,
      attempts: { lt: DOCUMENT_TAX_DISPATCH_MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: DOCUMENT_TAX_DISPATCH_BATCH_SIZE,
  });

  for (const dispatch of pendingDispatches) {
    await enqueueDocumentTaxDispatch(dispatch.documentId, dispatch.companyId);
  }

  if (pendingDispatches.length > 0) {
    log.info("document_tax_dispatch_reconcile_completed", {
      processed: pendingDispatches.length,
    });
  }
}
