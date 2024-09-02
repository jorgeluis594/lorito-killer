"use server";

import { type Customer } from "@/customer/types";
import { response } from "@/lib/types";
import { createCustomer as persistCustomer } from "@/customer/db_repository";
import gatewayCreator from "@/document/factpro/gateway";
import { getSession } from "@/lib/auth";
import { getBillingCredentialsFor } from "@/document/db_repository";

export const createCustomer = async (
  customer: Customer,
): Promise<response<Customer>> => persistCustomer(customer);

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

  const { fetchCustomerByRuc, fetchCustomerByDNI } = gatewayCreator(
    billingCredentialsResponse.data.token,
  );
  const fetchFunction =
    documentType === "invoice" ? fetchCustomerByRuc : fetchCustomerByDNI;

  return fetchFunction(documentNumber);
};
