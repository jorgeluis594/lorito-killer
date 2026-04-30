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
  if (value === undefined || value === null || value === "") {
    return "No disponible";
  }
  return String(value);
};

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
};

const companyLabel = (
  company?: DocumentFailureNotification["company"],
) => {
  if (!company) return "No disponible";
  return company.name || company.subName || company.subdomain || "No disponible";
};

const EVENT_LABELS: Record<DocumentFailureEvent, string> = {
  factpro_submission_failed: "Fallo al enviar el documento a FactPro",
  document_persist_failed: "Fallo al guardar el documento",
  document_update_failed: "Fallo al actualizar el documento",
  tax_entity_submission_error: "Error al enviar el documento a la entidad tributaria",
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "Factura",
  receipt: "Boleta",
  ticket: "Nota de venta",
};

const documentLabel = (
  documentType?: DocumentType,
  series?: string,
  number?: string,
) => {
  const type = documentType
    ? DOCUMENT_TYPE_LABELS[documentType]
    : "Tipo no disponible";
  const correlative = [series, number].filter(Boolean).join("-");

  if (!correlative) return type;

  return `${type} ${correlative}`;
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
    "Error enviando documento",
    "",
    `Evento: ${EVENT_LABELS[event]}`,
    `Empresa: ${companyLabel(company)}`,
    `ID de empresa: ${formatValue(company?.id || companyId)}`,
    `Subdominio: ${formatValue(company?.subdomain)}`,
    `Documento: ${documentLabel(documentType, series, number)}`,
    `Pedido: ${formatValue(orderId)}`,
    `ID de documento: ${formatValue(documentId)}`,
    "",
    "Error:",
    truncate(cause, MAX_CAUSE_LENGTH),
  ].join("\n");

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
