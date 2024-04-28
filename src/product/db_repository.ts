import prisma from "@/lib/prisma";
import type {
  Product,
  Photo,
  ProductSearchParams,
  ProductSortParams,
} from "./types";
import { Category } from "@/category/types";
import { addCategoryToProduct } from "@/category/db_respository";
import { response, successResponse } from "@/lib/types";

interface searchParams {
  q: string;
  categoryId?: string | null;
}

export const create = async (product: Product): Promise<response<Product>> => {
  try {
    const { photos, categories, ...productData } = product;
    const data: any = {
      ...productData,
      photos: photos ? { create: photos } : undefined,
    };

    const createdResponse = await prisma.product.create({ data });
    const price = createdResponse.price.toNumber();
    const purchasePrice = createdResponse.purchasePrice.toNumber();
    const createdProduct: Product = {
      ...createdResponse,
      companyId: createdResponse.companyId || "some_company_id",
      sku: createdResponse.sku || undefined,
      price,
      purchasePrice,
      categories: [],
    };

    const categoriesResponse = await Promise.all(
      categories.map((c) => addCategoryToProduct(createdProduct, c)),
    );
    createdProduct.categories = categoriesResponse
      .filter((c): c is successResponse<Category> => c.success)
      .map((c) => c.data);

    return { success: true, data: { ...createdProduct, price } };
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
  sortBy,
  categoryId,
  q,
}: {
  sortBy?: ProductSortParams;
  categoryId?: searchParams["categoryId"];
  q?: string | null;
}): Promise<response<Product[]>> => {
  try {
    const query: any = {
      where: {},
      orderBy: sortBy,
      include: { photos: true, categories: true },
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

    const result = await prisma.product.findMany(query);
    const products = await Promise.all(
      result.map(async (p) => {
        const price = p.price.toNumber(); // Prisma (DB) returns decimal and Product model expects number
        const purchasePrice = p.purchasePrice.toNumber();
        return {
          ...p,
          companyId: p.companyId || "some_company_id",
          price,
          purchasePrice,
        } as Product;
      }),
    );

    return { success: true, data: products };
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};

export const find = async (id: string): Promise<response<Product>> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { photos: true, categories: true },
    });

    if (product) {
      const price = product.price.toNumber(); // Prisma (DB) returns decimal and Product model expects number
      const purchasePrice = product.purchasePrice.toNumber();
      return {
        success: true,
        data: { ...product, price, purchasePrice },
      } as response;
    } else {
      return { success: false, message: "Product not found" } as response;
    }
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};

export const findBy = async (
  params: ProductSearchParams,
): Promise<response<Product>> => {
  try {
    const { categories, ...rest } = params;
    const searchParams: any = { ...rest };
    if (categories) {
      searchParams.categories = { categories: { id: categories.id } };
    }

    const product = await prisma.product.findFirst({ where: searchParams });
    if (!product) return { success: false, message: "Product not found" };

    return { success: true, data: product } as response;
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};

export const deleteProduct = async (
  product: Product,
): Promise<response<Product>> => {
  try {
    const deletedProduct = await prisma.product.delete({
      where: { id: product.id },
    });
    return { success: true, data: deletedProduct } as response;
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};

export const getPhotos = async (
  productId: string,
): Promise<response<Photo[]>> => {
  try {
    const photos = await prisma.photo.findMany({ where: { productId } });
    return { success: true, data: photos } as response<Photo[]>;
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};

export const getPhoto = async (
  productId: string,
  photoId: string,
): Promise<response<Photo>> => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo)
      return { success: false, message: "Photo not found" } as response;
    return { success: true, data: photo } as response<Photo>;
  } catch (error: any) {
    return { success: false, message: error.message } as response;
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
    return { success: true, data: createdPhotos } as response<Photo[]>;
  } catch (error: any) {
    return { success: false, message: error.message } as response;
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
    return { success: true, data: photoResponse.data } as response;
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};

export const search = async ({
  q,
  categoryId,
}: searchParams): Promise<response<Product[]>> => {
  try {
    const query: any = { name: { contains: q, mode: "insensitive" } };
    if (categoryId) query.categories = { some: { id: categoryId } };

    const result = await prisma.product.findMany({
      where: query,
      include: { photos: true, categories: true },
    });
    const products = await Promise.all(
      result.map(async (p) => {
        const price = p.price.toNumber(); // Prisma (DB) returns decimal and Product model expects number
        const purchasePrice = p.purchasePrice.toNumber();
        return { ...p, price, purchasePrice } as Product;
      }),
    );

    return { success: true, data: products };
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};
