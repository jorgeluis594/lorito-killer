import { Queue } from "bullmq";
import { connection } from "../connection";

export interface SendToTaxEntityJobData {
  orderId: string;
  companyId: string;
  documentId: string;
}

export const DOCUMENT_QUEUE_NAME = "document";

export const documentQueue = new Queue<SendToTaxEntityJobData>(
  DOCUMENT_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 4,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  },
);
