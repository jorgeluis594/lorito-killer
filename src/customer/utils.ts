import { BusinessCustomer, Customer, NaturalCustomer } from "./types";

export function isBusinessCustomer(
  customer: Customer,
): customer is BusinessCustomer {
  return customer.documentType === "ruc";
}

export function isNaturalCustomer(
  customer: Customer,
): customer is NaturalCustomer {
  return customer.documentType === "dni";
}
