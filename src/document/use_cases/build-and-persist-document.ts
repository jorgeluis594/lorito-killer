"use server";

import { response } from "@/lib/types";
import { Order } from "@/order/types";
import type { Document, DocumentType, BillingCredentials } from "@/document/types";
import { errorResponse, max } from "@/lib/utils";
import { log } from "@/lib/log";

export interface DocumentMetadata {
  serialNumber: string;
  documentNumber: number;
  establishmentCode: string;
}

interface Repository {
  createDocument: (document: Document) => Promise<response<Document>>;
  getLastDocumentNumber: (
    companyId: string,
    serialNumber: string,
  ) => Promise<response<number | undefined>>;
}

type BillingSettings = Omit<
  BillingCredentials,
  "billingToken" | "customerSearchToken"
>;

const serverError = errorResponse(
  "Error al realizar la venta, comuniquese con nostros para solucionar el problema",
);

export const buildAndPersistDocument = async (
  repository: Repository,
  order: Order,
  billingConfig: BillingSettings,
): Promise<response<Document>> => {
  const documentNumberAndSerialResponse =
    await getAvailableDocumentNumberAndSerial(
      order.companyId,
      billingConfig,
      repository.getLastDocumentNumber,
      order.documentType,
    );
  if (!documentNumberAndSerialResponse.success) {
    log.error("get_serial_number_failed", {
      order,
      documentNumberAndSerialResponse,
    });
    return serverError;
  }

  const documentMetadata = {
    ...documentNumberAndSerialResponse.data,
    establishmentCode: billingConfig.establishmentCode,
  };

  // Build document structure based on type
  let document: Document;
  const baseDocument = {
    id: crypto.randomUUID(),
    companyId: order.companyId!,
    orderId: order.id!,
    customerId: order.customerId,
    discountAmount: order.discountAmount,
    total: order.total,
    netTotal: order.netTotal,
    series: documentMetadata.serialNumber,
    number: documentMetadata.documentNumber.toString(),
    dateOfIssue: new Date(),
    status: "registered" as const,
  };

  switch (order.documentType) {
    case "ticket":
      document = {
        ...baseDocument,
        documentType: "ticket",
        taxTotal: 0,
      };
      break;
    case "receipt":
      document = {
        ...baseDocument,
        documentType: "receipt",
        taxTotal: 0,
        qr: "", // Will be filled by tax entity service
        hash: "", // Will be filled by tax entity service
      };
      break;
    case "invoice":
      if (!baseDocument.customerId) {
        return errorResponse("Invoice requires a customer");
      }
      document = {
        ...baseDocument,
        customerId: baseDocument.customerId,
        documentType: "invoice",
        taxTotal: 0,
        qr: "", // Will be filled by tax entity service
        hash: "", // Will be filled by tax entity service
      };
      break;
    default:
      throw new Error("Invalid document type");
  }

  log.info("document_built", { document, documentMetadata });

  const persistedDocumentResponse = await repository.createDocument(document);
  if (!persistedDocumentResponse.success) {
    return serverError;
  }

  log.info("document_persisted", { persistedDocumentResponse });

  return persistedDocumentResponse;
};

const getAvailableDocumentNumberAndSerial = async (
  companyId: string,
  billingSettings: BillingSettings,
  getLastDocumentNumber: Repository["getLastDocumentNumber"],
  documentType: DocumentType,
): Promise<response<{ documentNumber: number; serialNumber: string }>> => {
  let documentDetailsResponse: response<{
    number: number;
    serialNumber: string;
  }>;

  const {
    invoiceSerialNumber,
    invoiceStartsOnNumber,
    receiptSerialNumber,
    receiptStartsOnNumber,
  } = billingSettings;

  switch (documentType) {
    case "invoice":
      if (!invoiceSerialNumber) {
        return serverError;
      }
      documentDetailsResponse = await getDocumentDetails(
        companyId,
        invoiceSerialNumber,
        invoiceStartsOnNumber,
        getLastDocumentNumber,
      );
      break;
    case "receipt":
      if (!receiptSerialNumber) {
        return serverError;
      }

      documentDetailsResponse = await getDocumentDetails(
        companyId,
        receiptSerialNumber,
        receiptStartsOnNumber,
        getLastDocumentNumber,
      );
      break;
    case "ticket":
      documentDetailsResponse = await getDocumentDetails(
        companyId,
        billingSettings.ticketSerialNumber,
        undefined,
        getLastDocumentNumber,
      );
      break;
    default:
      throw new Error("Invalid document type");
  }

  if (!documentDetailsResponse.success) return documentDetailsResponse;

  return {
    success: true,
    data: {
      documentNumber: documentDetailsResponse.data.number + 1,
      serialNumber: documentDetailsResponse.data.serialNumber,
    },
  };
};

const DEFAULT_DOCUMENT_NUMBER = 0;

const getDocumentDetails = async (
  companyId: string,
  serialNumber: string,
  startsOnNumber: number | undefined,
  getLastDocumentNumber: Repository["getLastDocumentNumber"],
): Promise<response<{ number: number; serialNumber: string }>> => {
  const response = await getLastDocumentNumber(companyId, serialNumber);
  if (!response.success) return response;

  const num = startsOnNumber
    ? max(startsOnNumber)(response.data || DEFAULT_DOCUMENT_NUMBER)
    : response.data || DEFAULT_DOCUMENT_NUMBER;

  return {
    success: true,
    data: {
      number: num,
      serialNumber,
    },
  };
};