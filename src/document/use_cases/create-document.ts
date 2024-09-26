"use server";

import { ErrorResponse, response } from "@/lib/types";
import { Order, OrderWithBusinessCustomer } from "@/order/types";
import type {
  Document,
  Invoice,
  Receipt,
  Ticket,
  DocumentType,
  BillingCredentials,
} from "@/document/types";
import { hasBusinessCustomer } from "@/order/utils";
import { errorResponse, max } from "@/lib/utils";
import { log } from "@/lib/log";

export interface DocumentMetadata {
  serialNumber: string;
  documentNumber: number;
  establishmentCode: string;
}

export interface DocumentGateway {
  createInvoice: (
    order: OrderWithBusinessCustomer,
    documentMetadata: DocumentMetadata,
  ) => Promise<response<Invoice>>;
  createReceipt: (
    order: Order,
    documentMetadata: DocumentMetadata,
  ) => Promise<response<Receipt>>;
  createTicket: (
    order: Order,
    documentMetadata: Omit<DocumentMetadata, "establishmentCode">,
  ) => Promise<response<Ticket>>;
}

interface Repository {
  createDocument: (document: Document) => Promise<response<Document>>;
  getLastDocumentNumber: (
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

export const createDocument = async (
  documentGateway: DocumentGateway,
  repository: Repository,
  order: Order,
  billingConfig: BillingSettings,
): Promise<response<Document>> => {
  let documentResponse: response<Document>;
  const documentNumberAndSerialResponse =
    await getAvailableDocumentNumberAndSerial(
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

  const { establishmentCode, ...restMetadata } = documentMetadata;

  switch (order.documentType) {
    case "ticket":
      documentResponse = await documentGateway.createTicket(
        order,
        documentMetadata,
      );
      break;
    case "receipt":
      if (!establishmentCode) {
        return serverError;
      }

      documentResponse = await documentGateway.createReceipt(order, {
        ...restMetadata,
        establishmentCode,
      });
      break;
    case "invoice":
      if (!hasBusinessCustomer(order)) {
        return {
          success: false,
          message: "El cliente debe ser empresa",
        };
      }

      if (!establishmentCode) {
        return serverError;
      }

      documentResponse = await documentGateway.createInvoice(order, {
        ...restMetadata,
        establishmentCode,
      });
      break;
    default:
      throw new Error("Invalid document type");
  }

  if (!documentResponse.success) {
    return serverError;
  }

  const persistedDocumentResponse = await repository.createDocument(
    documentResponse.data,
  );
  if (!persistedDocumentResponse.success) {
    return serverError;
  }

  return persistedDocumentResponse;
};

const getAvailableDocumentNumberAndSerial = async (
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
        receiptSerialNumber,
        receiptStartsOnNumber,
        getLastDocumentNumber,
      );
      break;
    case "ticket":
      documentDetailsResponse = await getDocumentDetails(
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
  serialNumber: string,
  startsOnNumber: number | undefined,
  getLastDocumentNumber: Repository["getLastDocumentNumber"],
): Promise<response<{ number: number; serialNumber: string }>> => {
  const response = await getLastDocumentNumber(serialNumber);
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
