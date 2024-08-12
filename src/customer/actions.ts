"use server";

import { type Customer } from "@/customer/types";
import { response } from "@/lib/types";
import { createCustomer as persistCustomer } from "@/customer/db_repository";

export const createCustomer = async (
  customer: Customer,
): Promise<response<Customer>> => persistCustomer(customer);
