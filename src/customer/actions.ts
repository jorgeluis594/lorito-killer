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
  documentType: string,
) => {
  if(documentType === "invoice") {
    fetchCustomerByRuc(documentNumber);
    console.log("holi ruc")
  }else{
    fetchCustomerByDNI(documentNumber);
    console.log("holi dni")
  }
}