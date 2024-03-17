import prisma from "@/lib/prisma";
import { Product, Photo } from "./types";
import { response } from "@/lib/types"

export const create = async (product: Product):Promise<response<Product>> => {
  try {
    const { photos, ...productData } = product
    const createdProduct = await prisma.product.create({ data: productData })
    const price = createdProduct.price.toNumber();
    return { success: true, data: { ...createdProduct, price } } as response<Product>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const update = async(product: Product):Promise<response<Product>> => {
  const { photos, ...productData } = product
  try {
    await prisma.product.update({ where: { id: product.id }, data: productData })
    return { success: true, data: product } as response<Product>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const getMany = async ():Promise<response<Product[]>> => {
  try {
    const result = await prisma.product.findMany({include: { photos: true }})
    const products = result.map(p => {
      const price = p.price.toNumber(); // Prisma (DB) returns decimal and Product model expects number
      return { ...p, price }
    })

    return { success: true, data: products } as response<Product[]>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const find = async (id: string):Promise<response> => {
  try {
    const product = await prisma.product.findUnique({ where: { id }, include: { photos: true } })

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
    return { success: true, data: photos } as response<Photo[]>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const storePhotos = async (productId: string, photos: Photo[]):Promise<response> => {
  try {
    await prisma.photo.createMany({
      data: photos.map(photo => ({ ...photo, productId }))
    })
    return { success: true, data: photos } as response<Photo[]>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const removePhoto = async (productId: string, photoId: string):Promise<response> => {
  try {
    await prisma.photo.delete({ where: { id: photoId, productId: productId } })
    return { success: true } as response
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