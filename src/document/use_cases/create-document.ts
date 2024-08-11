"use server";

import { response } from "@/lib/types";
import { Order, OrderWithBusinessCustomer } from "@/order/types";
import { Company } from "@/company/types";
import { hasBusinessCustomer } from "@/order/utils";
import type { Document } from "@/document/types";
import type { Customer } from "@/customer/types";

interface DocumentGateway {
  createInvoice: (
    order: OrderWithBusinessCustomer,
    company: Company,
  ) => Promise<response<Document>>;
  createReceipt: (
    order: Order,
    company: Company,
  ) => Promise<response<Document>>;
}

interface Repository {
  createdDocument: (document: Document) => Promise<response<Document>>;
  createCustomer: (customer: Customer) => Promise<response<Customer>>;
}

export const createDocument = async (
  documentGateway: DocumentGateway,
  repository: Repository,
  order: Order,
  company: Company,
): Promise<response<Document>> => {
  if (order.documentType !== "receipt" || "invoice") {
    return { success: false, message: "not implemented" };
  }

  let documentResponse: response<Document>;
  // generar la factura o boleta
  if (order.documentType == "receipt") {
    documentResponse = await documentGateway.createReceipt(order, company);
  } else {
    if (!hasBusinessCustomer(order)) {
      return { success: false, message: "No customer found" };
    }

    documentResponse = await documentGateway.createInvoice(order, company);
  }

  if (!documentResponse.success) {
    return documentResponse;
  }

  return await repository.createdDocument(documentResponse.data);
};
