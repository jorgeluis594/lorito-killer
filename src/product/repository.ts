import prisma from "@/lib/prisma";
import productInterface from "./interface";
import { response, Photo } from "@/lib/types"

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

export const findProducts = async ():Promise<response> => {
  try {
    const products = await prisma.product.findMany()
    products.forEach((product: any) => {
      product.price = product.price.toNumber();
    })

    return { success: true, data: products } as response
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const findProduct = async (id: string):Promise<response> => {
  try {
    const product = await prisma.product.findUnique({ where: { id } })

    if (product) {
      (product.price as unknown) = product.price.toNumber();
      return { success: true, data: product } as response
    } else {
      return { success: false } as response
    }
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const getPhotos = async (productId: string):Promise<response> => {
  try {
    const photos = await prisma.photo.findMany({ where: { productId } })
    return { success: true, data: photos } as response
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const storePhotos = async (productId: string, photos: Photo[]):Promise<response> => {
  try {
    const createdPhotos = await prisma.photo.createMany({
      data: photos.map(photo => ({ ...photo, productId }))
    })
    return { success: true, data: createdPhotos } as response
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const removePhotos = async (photoIds: string[]):Promise<response> => {
  try {
    await prisma.photo.deleteMany({ where: { id: { in: photoIds } } })
    return { success: true } as response
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}