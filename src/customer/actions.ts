"use server";

import {type Customer} from "@/customer/types";
import {response} from "@/lib/types";
import {createCustomer as persistCustomer} from "@/customer/db_repository";
import {fetchCustomerByDNI, fetchCustomerByRuc} from "@/document/factpro_gateway";
import {FetchCustomer} from "@/document/types";

export const createCustomer = async (
  customer: Customer,
): Promise<response<Customer>> => persistCustomer(customer);

export const searchCustomer = async (
  documentNumber: string,
  documentType: string,
): Promise<response<Customer>> => {
  const fetchFunction = documentType === "invoice" ? fetchCustomerByRuc : fetchCustomerByDNI;

  return fetchFunction(documentNumber);
}
