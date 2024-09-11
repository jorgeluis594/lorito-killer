"use server";

import { response } from "@/lib/types";
import { Order, OrderWithBusinessCustomer } from "@/order/types";
import type {
  Document,
  Invoice,
  Receipt,
  Ticket,
  DocumentType,
} from "@/document/types";
import { hasBusinessCustomer } from "@/order/utils";
import { max } from "@/lib/utils";

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
    documentMetadata: DocumentMetadata,
  ) => Promise<response<Ticket>>;
}

interface Repository {
  createDocument: (document: Document) => Promise<response<Document>>;
  getLastDocumentNumber: (
    serialNumber: string,
  ) => Promise<response<number | undefined>>;
}

interface BillingSettings {
  invoiceSerialNumber: string;
  invoiceStarsOnNumber?: number;
  receiptSerialNumber: string;
  receiptStarsOnNumber?: number;
  ticketSerialNumber: string;
  establishmentCode: string;
}

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
    return documentNumberAndSerialResponse;
  }

  const documentMetadata = {
    ...documentNumberAndSerialResponse.data,
    establishmentCode: billingConfig.establishmentCode,
  };

  switch (order.documentType) {
    case "ticket":
      documentResponse = await documentGateway.createTicket(
        order,
        documentMetadata,
      );
      break;
    case "receipt":
      documentResponse = await documentGateway.createReceipt(
        order,
        documentMetadata,
      );
      break;
    case "invoice":
      if (!hasBusinessCustomer(order)) {
        return {
          success: false,
          message: "Customer must be a BusinessCustomer",
        };
      }
      documentResponse = await documentGateway.createInvoice(
        order,
        documentMetadata,
      );
      break;
    default:
      throw new Error("Invalid document type");
  }

  if (!documentResponse.success) {
    return documentResponse;
  }

  return repository.createDocument(documentResponse.data);
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

  switch (documentType) {
    case "invoice":
      documentDetailsResponse = await getDocumentDetails(
        billingSettings.invoiceSerialNumber,
        billingSettings.invoiceStarsOnNumber,
        getLastDocumentNumber,
      );
      break;
    case "receipt":
      documentDetailsResponse = await getDocumentDetails(
        billingSettings.receiptSerialNumber,
        billingSettings.receiptStarsOnNumber,
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
  starsOnNumber: number | undefined,
  getLastDocumentNumber: Repository["getLastDocumentNumber"],
): Promise<response<{ number: number; serialNumber: string }>> => {
  const response = await getLastDocumentNumber(serialNumber);
  if (!response.success) return response;

  const num = starsOnNumber
    ? max(starsOnNumber)(response.data || DEFAULT_DOCUMENT_NUMBER)
    : response.data || DEFAULT_DOCUMENT_NUMBER;

  return {
    success: true,
    data: {
      number: num,
      serialNumber,
    },
  };
};
