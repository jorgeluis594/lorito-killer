"use server";

import { Category } from "./types";
import {
  create,
  find as findCategory,
  addCategoryToProduct as attachCategoryToProduct,
  removeCategoryFromProduct as detachCategoryFromProduct,
} from "./db_respository";
import { find as findProduct } from "@/product/db_repository";
import { response } from "@/lib/types";
import { Product } from "@/product/types";
import { revalidatePath } from "next/cache";

export const createCategory = async (
  category: Category,
): Promise<response<Category>> => {
  const res = await create(category);
  revalidatePath("/api/categories");

  return res;
};

export const addCategoryToProduct = async (
  productId: string,
  categoryId: string,
): Promise<response<Category>> => {
  const [productResponse, categoryResponse] = await Promise.all([
    findProduct(productId),
    findCategory(categoryId),
  ]);

  if (!productResponse.success) return productResponse;
  if (!categoryResponse.success) return categoryResponse;

  return await attachCategoryToProduct(
    productResponse.data as Product,
    categoryResponse.data as Category,
  );
};

export const removeCategoryFromProduct = async (
  productId: string,
  categoryId: string,
): Promise<response<Category>> => {
  const [productResponse, categoryResponse] = await Promise.all([
    findProduct(productId),
    findCategory(categoryId),
  ]);

  if (!productResponse.success) return productResponse;
  if (!categoryResponse.success) return categoryResponse;

  revalidatePath(`/products/${productId}`);
  return await detachCategoryFromProduct(
    productResponse.data as Product,
    categoryResponse.data as Category,
  );
};
