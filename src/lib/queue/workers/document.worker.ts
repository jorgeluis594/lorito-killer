import { Worker, Job } from "bullmq";
import { connection } from "../connection";
import {
  DOCUMENT_QUEUE_NAME,
  SendToTaxEntityJobData,
} from "../queues/document.queue";
import { sendToTaxEntity } from "@/document/use_cases/send-to-tax-entity";
import {
  updateDocument,
  findDocumentById,
  getBillingCredentialsFor,
} from "@/document/db_repository";
import { find as getOrder } from "@/order/db_repository";
import billingDocumentGateway from "@/document/factpro/gateway";
import { log } from "@/lib/log";

async function processSendToTaxEntity(job: Job<SendToTaxEntityJobData>) {
  const { documentId, companyId } = job.data;

  log.info("send_to_tax_entity_started", {
    documentId,
    companyId,
    attempt: job.attemptsMade + 1,
  });

  const billingCredentialsResponse = await getBillingCredentialsFor(companyId);
  if (!billingCredentialsResponse.success) {
    throw new Error("No billing credentials found");
  }

  const { billingToken, ...billingSettings } =
    billingCredentialsResponse.data;

  const result = await sendToTaxEntity(
    billingDocumentGateway({ billingToken }),
    {
      updateDocument,
      findDocument: findDocumentById,
      getOrder,
    },
    documentId,
    { ...billingSettings, billingToken },
  );

  if (!result.success) {
    throw new Error(
      `Failed to send document to tax entity: ${result.message}`,
    );
  }

  log.info("send_to_tax_entity_completed", { documentId, companyId });
  return result;
}

export function createDocumentWorker() {
  const worker = new Worker<SendToTaxEntityJobData>(
    DOCUMENT_QUEUE_NAME,
    processSendToTaxEntity,
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    log.info("job_completed", {
      jobId: job.id,
      jobName: job.name,
      documentId: job.data.documentId,
    });
  });

  worker.on("failed", (job, err) => {
    log.error("job_failed", {
      jobId: job?.id,
      jobName: job?.name,
      documentId: job?.data.documentId,
      error: err.message,
      attempt: job?.attemptsMade,
    });
  });

  worker.on("error", (err) => {
    log.error("worker_error", { error: err.message });
  });

  return worker;
}
