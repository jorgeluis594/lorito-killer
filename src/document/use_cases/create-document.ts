"use server";

import {response} from "@/lib/types";
import {Order, OrderWithCustomer} from "@/order/types";
import {Company} from "@/company/types";
import {hasCustomer} from "@/order/utils";

interface DocumentRepository {
  createInvoice: (order: OrderWithCustomer, company: Company) => Promise<response<Order>>;
  createReceipt: (order: Order, company: Company) => Promise<response<Order>>;
}

export const createDocument = async (
  repository: DocumentRepository,
  order: Order,
  company: Company,
): Promise<response<Order>> => {
  if (order.documentType !== 'receipt' || 'invoice') {
    return {success: false, message: "not implemented"};
  }

  if (order.documentType == 'receipt') {
    return repository.createReceipt(order, company);
  }

  if (!hasCustomer(order)) {
    return {success: false, message: "No customer found"}
  }

  return repository.createInvoice(order, company);
};