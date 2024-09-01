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
  getLastDocumentNumber: (serialNumber: string) => Promise<response<number>>;
}

interface BillingSettings {
  invoiceSerialNumber: string;
  receiptSerialNumber: string;
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
  const documentNumberAndSerialResponse = await getDocumentNumberAndSerial(
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

  return await repository.createDocument(documentResponse.data);
};

const getDocumentNumberAndSerial = async (
  billingSettings: BillingSettings,
  obtainLastNumber: Repository["getLastDocumentNumber"],
  documentType: DocumentType,
): Promise<response<{ documentNumber: number; serialNumber: string }>> => {
  let response: response<number>;
  let serialNumber: string;

  switch (documentType) {
    case "invoice":
      response = await obtainLastNumber(billingSettings.invoiceSerialNumber);
      serialNumber = billingSettings.invoiceSerialNumber;
      break;
    case "receipt":
      response = await obtainLastNumber(billingSettings.receiptSerialNumber);
      serialNumber = billingSettings.receiptSerialNumber;
      break;
    case "ticket":
      response = await obtainLastNumber(billingSettings.ticketSerialNumber);
      serialNumber = billingSettings.ticketSerialNumber;
      break;
    default:
      throw new Error("Invalid document type");
  }

  if (!response.success) {
    return response;
  }

  return {
    success: true,
    data: { documentNumber: response.data + 1, serialNumber: serialNumber },
  };
};
