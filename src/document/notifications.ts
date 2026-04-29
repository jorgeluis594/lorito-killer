import type { Company } from "@/company/types";
import type { Document, DocumentType } from "@/document/types";
import { log } from "@/lib/log";
import { sendDiscordTextNotification } from "@/notification";

type DocumentFailureEvent =
  | "factpro_submission_failed"
  | "document_persist_failed"
  | "document_update_failed"
  | "tax_entity_submission_error";

type DocumentFailureNotification = {
  event: DocumentFailureEvent;
  company?: Pick<Company, "id" | "name" | "subName" | "subdomain">;
  companyId?: string;
  orderId?: string;
  documentId?: string;
  documentType?: DocumentType;
  series?: string;
  number?: string;
  cause: string;
};

const MAX_CAUSE_LENGTH = 280;

const formatValue = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "N/A";
  return String(value);
};

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
};

const companyLabel = (
  company?: DocumentFailureNotification["company"],
) => {
  if (!company) return "N/A";
  return company.name || company.subName || company.subdomain || "N/A";
};

export const documentDetailsForNotification = (document: Document) => ({
  companyId: document.companyId,
  orderId: document.orderId,
  documentId: document.id,
  documentType: document.documentType,
  series: document.series,
  number: document.number,
});

export const notifyDocumentFailure = async ({
  event,
  company,
  companyId,
  orderId,
  documentId,
  documentType,
  series,
  number,
  cause,
}: DocumentFailureNotification) => {
  const message = [
    `Error documento: ${event}`,
    `empresa=${companyLabel(company)}`,
    `companyId=${formatValue(company?.id || companyId)}`,
    `subdomain=${formatValue(company?.subdomain)}`,
    `orderId=${formatValue(orderId)}`,
    `documentId=${formatValue(documentId)}`,
    `tipo=${formatValue(documentType)}`,
    `serie=${formatValue(series)}`,
    `numero=${formatValue(number)}`,
    `causa=${truncate(cause, MAX_CAUSE_LENGTH)}`,
  ].join(" | ");

  const notificationResponse = await sendDiscordTextNotification(message);

  if (!notificationResponse.success) {
    log.warn("document_failure_notification_failed", {
      event,
      companyId: company?.id || companyId,
      orderId,
      documentId,
      message: notificationResponse.message,
    });
  }
};
