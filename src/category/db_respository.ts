import prisma from "@/lib/prisma";
import { Category } from "./types";
import { Product } from "@/product/types";
import { response } from "@/lib/types"
import {find as findProduct} from "@/product/db_repository";

export const create = async (category: Category):Promise<response<Category>> => {
  try {
    const foundResponse = await findByName(category.name)
    if (foundResponse.success) {
      return foundResponse as response
    }

    const createdCategory = await prisma.category.create({ data: category })
    return { success: true, data: createdCategory } as response<Category>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const getMany = async ():Promise<response<Category[]>> => {
  try {
    const categories = await prisma.category.findMany()
    return { success: true, data: categories } as response<Category[]>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const find = async (id: string):Promise<response<Category>> => {
  try {
    const category = await prisma.category.findUnique({ where: { id } })

    if (category) {
      return { success: true, data: category } as response<Category>
    } else {
      return { success: false, message: "Category not found" } as response
    }
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const addCategoryToProduct = async (product: Product, category: Category):Promise<response<Category>> => {
  try {
    await prisma.categoriesOnProduct.create({
      data: {
        categoryId: category.id as string,
        productId: product.id as string
      }
    })

    return { success: true, data: category } as response<Category>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const removeCategoryFromProduct = async (product: Product, category: Category):Promise<response<Category>> => {
  try {
    const categoryOnProduct = await prisma.categoriesOnProduct.findFirst({
      where: { productId: product.id, categoryId: category.id }
    })
    if (!categoryOnProduct) return { success: false, message: "Category not found on product" } as response

    await prisma.categoriesOnProduct.delete({ where: { id: categoryOnProduct.id } })
    return { success: true, data: category } as response<Category>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

const findByName = async (name: string):Promise<response<Category>> => {
  try {
    const category = await prisma.category.findMany({
      where: {
        name: {
          equals: name,
          mode: "insensitive"
        }
      },
      take: 1
    })

    if (category.length) {
      return { success: true, data: category[0] } as response<Category>
    } else {
      return { success: false, message: "Category not found" } as response
    }
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}