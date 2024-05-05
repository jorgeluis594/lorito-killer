"use server";

import { findBy } from "@/product/db_repository";

export const findProductBySku = async (companyId: string, sku: string) => {
    return findBy({ sku, companyId });
  };