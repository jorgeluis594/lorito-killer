import { type Job } from "bullmq";
import { createDomainQueue } from "@/lib/queue/domain-queue";
import { sendToTaxEntity } from "@/document/use_cases/send-to-tax-entity";
import {
  updateDocument,
  findDocumentById,
  getBillingCredentialsFor,
} from "@/document/db_repository";
import { find as getOrder } from "@/order/db_repository";
import billingDocumentGateway from "@/document/factpro/gateway";
import { log } from "@/lib/log";

interface SendToTaxEntityJobData {
  companyId: string;
  documentId: string;
}

const documentQueue = createDomainQueue("document");

async function processSendToTaxEntity(
  data: SendToTaxEntityJobData,
  job: Job<SendToTaxEntityJobData>,
) {
  const { documentId, companyId } = data;

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

export const sendToTaxEntityJob =
  documentQueue.job<SendToTaxEntityJobData>(
    "send-to-tax-entity",
    {
      idempotency: (data) => data.documentId,
      logContext: (data) => ({
        documentId: data.documentId,
      }),
    },
    processSendToTaxEntity,
  );

export const documentJobs = documentQueue.module();
