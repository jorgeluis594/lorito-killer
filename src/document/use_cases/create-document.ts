"use server";

import { response } from "@/lib/types";
import { Order, OrderWithBusinessCustomer } from "@/order/types";
import { Company } from "@/company/types";
import { hasBusinessCustomer } from "@/order/utils";
import type { Document, Invoice, Receipt, Ticket } from "@/document/types";

interface DocumentGateway {
  createInvoice: (
    order: OrderWithBusinessCustomer,
    company: Company,
  ) => Promise<response<Invoice>>;
  createReceipt: (order: Order, company: Company) => Promise<response<Receipt>>;
  createTicket: (order: Order, company: Company) => Promise<response<Ticket>>;
}

interface Repository {
  createDocument: (document: Document) => Promise<response<Document>>;
}

export const createDocument = async (
  documentGateway: DocumentGateway,
  repository: Repository,
  order: Order,
  company: Company,
): Promise<response<Document>> => {
  let documentResponse: response<Document>;

  switch (order.documentType) {
    case "ticket":
      documentResponse = await documentGateway.createTicket(order, company);
      break;
    case "receipt":
      documentResponse = await documentGateway.createReceipt(order, company);
      break;
    case "invoice":
      documentResponse = await documentGateway.createTicket(order, company);
      break;
    default:
      throw new Error("Invalid document type");
  }

  if (!documentResponse.success) {
    return documentResponse;
  }

  return await repository.createDocument(documentResponse.data);
};
