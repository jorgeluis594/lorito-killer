"use server";

import {response} from "@/lib/types";
import {Order, OrderWithBusinessCustomer} from "@/order/types";
import {Company} from "@/company/types";
import {hasBusinessCustomer} from "@/order/utils";
import { Document } from "@/document/types";

interface DocumentGateway {
  createInvoice: (order: OrderWithBusinessCustomer, company: Company) => Promise<response<Document>>;
  createReceipt: (order: Order, company: Company) => Promise<response<Document>>;
}

interface Repository {
  create: (document: Document) => Promise<response<Document>>
}

export const createDocument = async (
  documentGateway: DocumentGateway,
  repository: Repository,
  order: Order,
  company: Company,
): Promise<response<Document>> => {
  if (order.documentType !== 'receipt' || 'invoice') {
    return {success: false, message: "not implemented"};
  }

  let documentResponse: response<Document>;
  // generar la factura o boleta
  if (order.documentType == 'receipt') {
    documentResponse = await documentGateway.createReceipt(order, company);
  } else {
    if (!hasBusinessCustomer(order)) {
      return {success: false, message: "No customer found"}
    }

    documentResponse = await documentGateway.createInvoice(order, company);
  }

  if (!documentResponse.success) {
    return documentResponse
  }

  return await repository.create(documentResponse.data)
};