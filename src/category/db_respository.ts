import prisma from "@/lib/prisma";
import { Category } from "./types";
import { response } from "@/lib/types"

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