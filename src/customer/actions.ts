"use server";

import { type Customer } from "@/customer/types";
import { response } from "@/lib/types";
import { createCustomer as persistCustomer, findCustomer } from "@/customer/db_repository";
import gatewayCreator from "@/document/factpro/gateway";
import { getSession } from "@/lib/auth";
import { getBillingCredentialsFor } from "@/document/db_repository";

export const createCustomer = async (
  customer: Customer,
): Promise<response<Customer>> => {
  const session = await getSession();

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

  const { fetchCustomerByRuc, fetchCustomerByDNI } = gatewayCreator({
    customerSearchToken: billingCredentialsResponse.data.customerSearchToken,
  });

  const fetchFunction =
    documentType === "invoice" ? fetchCustomerByRuc : fetchCustomerByDNI;

  const response = await fetchFunction(documentNumber);

  if (!response.success) {
    return { success: false, message: "No se encontro al cliente" };
  }

  return response;
};

export const findCustomerById = async (id: string ): Promise<response<Customer>> => {
  const response = await findCustomer(id);

  if(!response) { return {success: false, message: "No se encontro al cliente" }; }

  return response

}