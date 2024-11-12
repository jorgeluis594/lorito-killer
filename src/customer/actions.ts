"use server";

import { type Customer } from "@/customer/types";
import { response } from "@/lib/types";
import {
  createCustomer as persistCustomer,
  findByDocumentNumber,
} from "@/customer/db_repository";
import gatewayCreator from "@/document/factpro/gateway";
import { getSession } from "@/lib/auth";
import { getBillingCredentialsFor } from "@/document/db_repository";
import { log } from "@/lib/log";

export const createCustomer = async (
  customer: Customer,
): Promise<response<Customer>> => {
  const session = await getSession();

  const responseFind = await findByDocumentNumber(
    session.user.companyId,
    String(customer.documentNumber),
  );

  if (responseFind.success) {
    log.info("Customer is already registered", { customer, responseFind });
    return { success: false, message: "Cliente ya registrado." };
  }

  return persistCustomer({ ...customer, companyId: session.user.companyId });
};

export const searchCustomer = async (
  documentNumber: string,
  documentType: string,
): Promise<response<Customer>> => {
  const session = await getSession();
  const billingCredentialsResponse = await getBillingCredentialsFor(
    session.user.companyId,
  );
  if (!billingCredentialsResponse.success) {
    return billingCredentialsResponse;
  }

  const responseFind = await findByDocumentNumber(
    session.user.companyId,
    documentNumber,
  );

  if (responseFind.success) {
    log.info("Customer is already registered", {
      documentNumber,
      responseFind,
    });
    return { success: false, message: "Cliente ya registrado." };
  }

  const { fetchCustomerByRuc, fetchCustomerByDNI } = gatewayCreator({
    customerSearchToken: billingCredentialsResponse.data.customerSearchToken,
  });

  const fetchFunction =
    documentType === "invoice" ? fetchCustomerByRuc : fetchCustomerByDNI;

  const response = await fetchFunction(documentNumber);

  if (!response.success) {
    log.error("fetch_customer_failed", {
      documentNumber,
      response,
      fetchFunction: fetchFunction.name,
    });
    return { success: false, message: "No se encontro al cliente" };
  }

  return response;
};

export const findCustomerByDocumentNumber = async (documentNumber: string) => {
  const session = await getSession();
  const response = await findByDocumentNumber(
    session.user.companyId,
    documentNumber,
  );

  if (!response.success) {
    return { success: false, message: "No se encontro al cliente" };
  }

  return response;
};
