import prisma from "@/lib/prisma";
import { Product, Photo } from "./types";
import { response } from "@/lib/types"

export const create = async (product: Product):Promise<response<Product>> => {
  try {
    const { photos, ...productData } = product
    const data: any = { ...productData }
    if (photos) data.photos = { create: photos }

    const createdProduct = await prisma.product.create({ data: data })
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

export const find = async (id: string):Promise<response<Product>> => {
  try {
    const product = await prisma.product.findUnique({ where: { id }, include: { photos: true } })

    if (product) {
      (product.price as unknown) = product.price.toNumber();
      return { success: true, data: product } as response
    } else {
      return { success: false, message: "Product not found" } as response
    }
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const deleteProduct = async (product: Product):Promise<response<Product>> => {
  try {
    const deletedProduct = await prisma.product.delete({ where: { id: product.id } })
    return { success: true, data: deletedProduct } as response
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const getPhotos = async (productId: string):Promise<response<Photo[]>> => {
  try {
    const photos = await prisma.photo.findMany({ where: { productId } })
    return { success: true, data: photos } as response<Photo[]>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const getPhoto = async (productId: string, photoId: string):Promise<response<Photo>> => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } })
    if (!photo) return { success: false, message: 'Photo not found' } as response
    return { success: true, data: photo } as response<Photo>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const storePhotos = async (productId: string, photos: Photo[]):Promise<response<Photo[]>> => {
  const productPhotos = await getPhotos(productId)
  const photosToStore = photos.filter(photo => !(productPhotos?.data || []).find(p => p.key === photo.key))
  try {
    await prisma.photo.createMany({
      data: photosToStore.map(photo => ({ ...photo, productId }))
    })
    return { success: true, data: photos } as response<Photo[]>
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}

export const removePhoto = async (productId: string, photoId: string):Promise<response<Photo>> => {
  const photoResponse = await getPhoto(productId, photoId)
  if (!photoResponse.success) return photoResponse

  try {
    await prisma.photo.delete({
      where: { id: photoId, productId: productId } })
    return { success: true, data: photoResponse.data } as response
  } catch (error: any) {
    return { success: false, message: error.message } as response
  }
}
