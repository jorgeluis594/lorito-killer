import prisma from "@/lib/prisma";
import {
  Product,
  Photo,
  ProductSearchParams,
  ProductSortParams,
  SingleProduct,
  SingleProductType,
} from "./types";
import { Category } from "@/category/types";
import { addCategoryToProduct } from "@/category/db_respository";
import { response, successResponse } from "@/lib/types";
import { Prisma } from "@prisma/client";

interface searchParams {
  q: string;
  categoryId?: string | null;
}

const singleProductToPrisma = (
  product: SingleProduct,
): Prisma.ProductCreateInput => {
  const { type, ...data } = product;
  return {
    ...data,
    photos: product.photos ? { create: product.photos } : undefined,
    categories: product.categories
      ? { connect: product.categories.map((c) => ({ id: c.id })) }
      : undefined,
  };
};

export const create = async (
  product: SingleProduct,
): Promise<response<SingleProduct>> => {
  try {
    const { photos, categories, ...productData } = product;

    const createdResponse = await prisma.product.create({
      data: singleProductToPrisma(product),
    });
    const purchasePrice =
      createdResponse.purchasePrice && createdResponse.purchasePrice.toNumber();

    const productCategories = await prisma.category.findMany({
      where: { id: { in: categories.map((c) => c.id!) } },
    });

    const createdProduct: SingleProduct = {
      ...createdResponse,
      companyId: createdResponse.companyId || "some_company_id",
      type: SingleProductType,
      sku: createdResponse.sku || undefined,
      price: createdResponse.price.toNumber(),
      purchasePrice: purchasePrice || undefined,
      categories: productCategories.map((c) => ({
        ...c,
        companyId: c.companyId || "some_company_id",
      })),
    };

    return { success: true, data: createdProduct };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const update = async (product: Product): Promise<response<Product>> => {
  const { photos, categories, ...productData } = product;

  try {
    await prisma.product.update({
      where: { id: product.id },
      data: productData,
    });
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getMany = async ({
  companyId,
  sortBy,
  categoryId,
  q,
}: {
  companyId: string;
  sortBy?: ProductSortParams;
  categoryId?: searchParams["categoryId"];
  q?: string | null;
}): Promise<response<SingleProduct[]>> => {
  try {
    const query: Prisma.ProductFindManyArgs = {
      where: { companyId, isPackage: false },
      orderBy: sortBy,
    };
    if (categoryId)
      query.where = {
        ...query.where,
        categories: { some: { id: categoryId } },
      };
    if (q)
      query.where = {
        ...query.where,
        name: { contains: q, mode: "insensitive" },
      };

    const result = await prisma.product.findMany({
      ...query,
      include: { photos: true, categories: true },
    });
    const products = await Promise.all(
      result.map(async (p) => {
        const price = p.price.toNumber(); // Prisma (DB) returns decimal and Product model expects number
        const purchasePrice = !!p.purchasePrice
          ? p.purchasePrice.toNumber()
          : undefined;
        const result: SingleProduct = {
          ...p,
          companyId: p.companyId || "some_company_id",
          type: SingleProductType,
          sku: p.sku || undefined,
          price,
          categories: p.categories.map((c) => ({
            ...c,
            companyId: c.companyId || "some_company_id",
          })),
          purchasePrice,
        };
        return result;
      }),
    );

    return { success: true, data: products };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const find = async (id: string): Promise<response<SingleProduct>> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id, isPackage: true },
      include: { photos: true, categories: true },
    });

    if (product) {
      const price = product.price.toNumber(); // Prisma (DB) returns decimal and Product model expects number
      const purchasePrice = !!product.purchasePrice
        ? product.purchasePrice.toNumber()
        : undefined;
      return {
        success: true,
        data: {
          ...product,
          price,
          purchasePrice,
          companyId: product.companyId || "some_company_id",
          sku: product.sku || undefined,
          type: SingleProductType,
          categories: product.categories.map((c) => ({
            ...c,
            companyId: c.companyId || "some_company_id",
          })),
        },
      };
    } else {
      return { success: false, message: "Product not found" };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const findBy = async (
  params: ProductSearchParams,
): Promise<response<SingleProduct>> => {
  try {
    const { categories, ...rest } = params;
    const searchParams: any = { ...rest };
    if (categories) {
      searchParams.categories = { categories: { id: categories.id } };
    }

    const product = await prisma.product.findFirst({
      where: { ...searchParams, isPackage: false },
      include: { photos: true, categories: true },
    });
    if (!product) return { success: false, message: "Product not found" };

    return {
      success: true,
      data: {
        ...product,
        companyId: product.companyId || "some_company_id",
        type: SingleProductType,
        price: product.price.toNumber(),
        sku: product.sku || undefined,
        purchasePrice: !!product.purchasePrice
          ? product.purchasePrice.toNumber()
          : undefined,
        categories: product.categories.map((c) => ({
          ...c,
          companyId: c.companyId || "some_company_id",
        })),
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const deleteProduct = async (
  product: SingleProduct,
): Promise<response<SingleProduct>> => {
  try {
    const deletedProduct = await prisma.product.delete({
      where: { id: product.id, isPackage: false },
    });
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getPhotos = async (
  productId: string,
): Promise<response<Photo[]>> => {
  try {
    const photos = await prisma.photo.findMany({ where: { productId } });
    return { success: true, data: photos };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getPhoto = async (
  productId: string,
  photoId: string,
): Promise<response<Photo>> => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) return { success: false, message: "Photo not found" };
    return { success: true, data: photo };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const storePhotos = async (
  productId: string,
  photos: Photo[],
): Promise<response<Photo[]>> => {
  const productPhotosResponse = await getPhotos(productId);

  if (!productPhotosResponse.success)
    return { success: false, message: productPhotosResponse.message };

  const photosToStore = photos.filter(
    (photo) =>
      !(productPhotosResponse.data || []).find((p) => p.key === photo.key),
  );
  try {
    const createdPhotos = await Promise.all(
      photosToStore.map((photo) =>
        prisma.photo.create({
          data: {
            ...photo,
            productId,
          },
        }),
      ),
    );
    return { success: true, data: createdPhotos };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const removePhoto = async (
  productId: string,
  photoId: string,
): Promise<response<Photo>> => {
  const photoResponse = await getPhoto(productId, photoId);
  if (!photoResponse.success) return photoResponse;

  try {
    await prisma.photo.delete({
      where: { id: photoId, productId: productId },
    });
    return { success: true, data: photoResponse.data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const search = async ({
  q,
  categoryId,
}: searchParams): Promise<response<SingleProduct[]>> => {
  try {
    const query: Prisma.ProductWhereInput = {
      name: { contains: q, mode: "insensitive" },
      isPackage: false,
    };
    if (categoryId) query.categories = { some: { id: categoryId } };

    const result = await prisma.product.findMany({
      where: query,
      include: { photos: true, categories: true },
    });
    const products = await Promise.all(
      result.map(async (p) => {
        const price = p.price.toNumber(); // Prisma (DB) returns decimal and Product model expects number
        const purchasePrice = !!p.purchasePrice
          ? p.purchasePrice.toNumber()
          : undefined;
        return { ...p, price, purchasePrice };
      }),
    );

    return {
      success: true,
      data: products.map((p) => ({
        ...p,
        companyId: p.companyId || "some_company_id",
        sku: p.sku || undefined,
        type: SingleProductType,
        categories: p.categories.map((c) => ({
          ...c,
          companyId: c.companyId || "some_company_id",
        })),
      })),
    };
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};
