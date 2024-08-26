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
): Promise<response<FetchCustomer>> => {
  try {
    const fetchFunction = documentType === "invoice" ? fetchCustomerByRuc : fetchCustomerByDNI;

    const result = await fetchFunction(documentNumber);

    if (result.success) {
      return {
        success: true,
        data: {
          ...result.data,
          name: result.data.name,
          address: result.data.address,
        }
      };
    } else {
      return { success: false, message: result.message || "No se encontró el cliente" };
    }
  } catch (e) {
    return {success: false, message: "No se encontro el cliente"};
  }
}
