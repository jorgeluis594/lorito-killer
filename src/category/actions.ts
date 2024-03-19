"use server"

import { Category } from "./types"
import {create, find, find as findCategory, addCategoryToProduct as assignCategoryToProduct} from "./db_respository"
import { find as findProduct } from "@/product/db_repository"
import { response } from "@/lib/types";
import {Product} from "@/product/types";

export const createCategory = async (category: Category):Promise<response<Category>> => await create(category)

export const addCategoryToProduct = async (productId: string, categoryId: string):Promise<response<Category>> => {
  const [productResponse, categoryResponse] = await Promise.all([
    findProduct(productId),
    findCategory(categoryId)
  ]);

  if (!productResponse.success) return productResponse
  if (!categoryResponse.success) return categoryResponse

  return await assignCategoryToProduct(productResponse.data as Product, categoryResponse.data as Category)
}