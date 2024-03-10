import prisma from "@/lib/prisma";
import productInterface from "./interface";
import { response } from "@/lib/types"

export const createProduct = async (product: productInterface):Promise<response> => {
  try {
    const createdProduct = await prisma.product.create({ data: product })
    return { success: true, data: { id: createdProduct.id } } as response
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const updateProduct = async(product: productInterface):Promise<response> => {
  try {
    await prisma.product.update({ where: { id: product.id }, data: product })
    return { success: true } as response
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}