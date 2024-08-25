"use server";

import { type Customer } from "@/customer/types";
import { response } from "@/lib/types";
import { createCustomer as persistCustomer } from "@/customer/db_repository";
import {fetchCustomerByDNI, fetchCustomerByRuc} from "@/document/factpro_gateway";

export const createCustomer = async (
  customer: Customer,
): Promise<response<Customer>> => persistCustomer(customer);

export const searchCustomer = async  (
  documentNumber: string,
) => {
  if(documentNumber.length > 8) {
    fetchCustomerByRuc(documentNumber);
  }else{
    fetchCustomerByDNI(documentNumber);
  }
}