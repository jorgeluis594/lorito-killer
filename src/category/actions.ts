"use server";

import { Category } from "./types";
import {
  create,
  find as findCategory,
  addCategoryToProduct as attachCategoryToProduct,
  removeCategoryFromProduct as detachCategoryFromProduct,
  deleteCategory as deleted,
  update,
} from "./db_respository";
import { find as findProduct } from "@/product/db_repository";
import { response } from "@/lib/types";
import { Product } from "@/product/types";
import { revalidatePath } from "next/cache";

export const createCategory = async (
  category: Category,
): Promise<response<Category>> => {
  return await create(category);
};

export const updateCategory = async (
  category: Category,
): Promise<response<Category>> => {
  return await update(category);
};

export const deleteCategory = async (
  category: Category,
): Promise<response<Category>> => {
  return await deleted(category);
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
  if (categoryResponse.data.companyId !== productResponse.data.companyId) {
    return {
      success: false,
      message: "La categoría no pertenece a la misma empresa que el producto",
    };
  }

  revalidatePath(`/dashboard/products/${productId}`);

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
