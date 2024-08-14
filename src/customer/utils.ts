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

export function fullName(customer: Customer): string {
  if (isBusinessCustomer(customer)) {
    return customer.legalName;
  } else {
    return customer.fullName;
  }
}
