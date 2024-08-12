import { BusinessCustomer, Customer, NaturalCustomer } from "./types";

export function isBusinessCustomer(
  customer: Customer,
): customer is BusinessCustomer {
  return customer._branch === "BusinessCustomer";
}

export function isNaturalCustomer(
  customer: Customer,
): customer is NaturalCustomer {
  return customer._branch === "NaturalCustomer";
}
