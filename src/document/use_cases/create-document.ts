"use server";

import { response } from "@/lib/types";
import { Order, OrderWithBusinessCustomer } from "@/order/types";
import type { Document, Invoice, Receipt, Ticket } from "@/document/types";
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
}

export const createDocument = async (
  documentGateway: DocumentGateway,
  repository: Repository,
  order: Order,
): Promise<response<Document>> => {
  let documentResponse: response<Document>;
  switch (order.documentType) {
    case "ticket":
      documentResponse = await documentGateway.createTicket(order, {
        serialNumber: "asdb",
        documentNumber: 1,
        establishmentCode: "4",
      });
      break;
    case "receipt":
      documentResponse = await documentGateway.createReceipt(order, {
        serialNumber: "asdb",
        documentNumber: 1,
        establishmentCode: "4",
      });
      break;
    case "invoice":
      if (!hasBusinessCustomer(order)) {
        return {
          success: false,
          message: "Customer must be a BusinessCustomer",
        };
      }
      documentResponse = await documentGateway.createInvoice(order, {
        serialNumber: "asdb",
        documentNumber: 1,
        establishmentCode: "4",
      });
      break;
    default:
      throw new Error("Invalid document type");
  }

  if (!documentResponse.success) {
    return documentResponse;
  }

  return await repository.createDocument(documentResponse.data);
};
