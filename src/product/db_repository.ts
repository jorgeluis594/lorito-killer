import prisma from "@/lib/prisma";
import {
  PackageProduct,
  PackageProductType,
  Photo,
  Product,
  ProductSearchParams,
  ProductSortParams,
  SingleProduct,
  SingleProductType,
} from "./types";
import { response } from "@/lib/types";
import {
  Category as PrismaCategory,
  Prisma,
  Product as PrismaProduct,
} from "@prisma/client";

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

const createSingleProduct = async (
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
      stock: createdResponse.stock!,
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

const packageProductToPrisma = (
  product: PackageProduct,
): Prisma.ProductCreateInput => {
  const { type, productItems, ...data } = product;
  return {
    ...data,
    photos: product.photos ? { create: product.photos } : undefined,
    isPackage: true,
    categories: product.categories
      ? { connect: product.categories.map((c) => ({ id: c.id })) }
      : undefined,
  };
};

const createPackageProduct = async (
  product: PackageProduct,
): Promise<response<PackageProduct>> => {
  try {
    const { photos, categories, ...productData } = product;

    const createdResponse = await prisma.product.create({
      data: packageProductToPrisma(product),
    });

    const packageItems = await Promise.all(
      product.productItems.map((item) =>
        prisma.packageItem.create({
          data: {
            id: item.id,
            parentProductId: createdResponse.id,
            childProductId: item.productId,
            quantity: item.quantity,
          },
        }),
      ),
    );

    const productCategories = await prisma.category.findMany({
      where: { id: { in: categories.map((c) => c.id!) } },
    });

    const createdProduct: PackageProduct = {
      ...createdResponse,
      companyId: createdResponse.companyId || "some_company_id",
      type: PackageProductType,
      sku: createdResponse.sku || undefined,
      price: createdResponse.price.toNumber(),
      productItems: packageItems.map((packageItem) => ({
        id: packageItem.id,
        productId: packageItem.childProductId,
        productName: product.productItems.find(
          (productItem) => productItem.id === packageItem.childProductId,
        )!.productName,
        quantity: packageItem.quantity,
      })),
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

export const create = async (product: Product): Promise<response<Product>> => {
  return product.type === SingleProductType
    ? createSingleProduct(product)
    : createPackageProduct(product);
};

export const update = async (
  product: SingleProduct,
): Promise<response<SingleProduct>> => {
  const { photos, categories, type, ...productData } = product;

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

const prismaToProduct = async (
  prismaProduct: PrismaProduct & { categories: PrismaCategory[] },
): Promise<Product> => {
  if (prismaProduct.isPackage) {
    const productItems = await prisma.packageItem.findMany({
      where: { parentProductId: prismaProduct.id },
      include: { parentProduct: true },
    });

    return {
      ...prismaProduct,
      companyId: prismaProduct.companyId || "some_company_id",
      type: PackageProductType,
      sku: prismaProduct.sku || undefined,
      price: prismaProduct.price.toNumber(),
      productItems: productItems.map((item) => ({
        id: item.childProductId,
        productId: item.childProductId,
        productName: item.parentProduct!.name,
        quantity: item.quantity,
      })),
      categories: prismaProduct.categories.map((c) => ({
        ...c,
        companyId: c.companyId || "some_company_id",
      })),
    };
  } else {
    const price = prismaProduct.price.toNumber(); // Prisma (DB) returns decimal and Product model expects number
    const purchasePrice = !!prismaProduct.purchasePrice
      ? prismaProduct.purchasePrice.toNumber()
      : undefined;
    return {
      ...prismaProduct,
      companyId: prismaProduct.companyId || "some_company_id",
      type: SingleProductType,
      sku: prismaProduct.sku || undefined,
      stock: prismaProduct.stock!,
      price,
      categories: prismaProduct.categories.map((c) => ({
        ...c,
        companyId: c.companyId || "some_company_id",
      })),
      purchasePrice,
    };
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
}): Promise<response<Product[]>> => {
  try {
    const query: Prisma.ProductFindManyArgs = {
      where: { companyId },
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
      include: { photos: true, categories: true, childPackageItems: true },
    });
    const products = await Promise.all(result.map(prismaToProduct));

    return { success: true, data: products };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const find = async (id: string): Promise<response<Product>> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { photos: true, categories: true },
    });

    if (product) {
      return { success: true, data: await prismaToProduct(product) };
    } else {
      return { success: false, message: "Product not found" };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
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

    const product = await prisma.product.findFirst({
      where: { ...searchParams },
      include: { photos: true, categories: true },
    });
    if (!product) return { success: false, message: "Product not found" };

    return {
      success: true,
      data: await prismaToProduct(product),
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const deleteProduct = async (
  product: Product,
): Promise<response<Product>> => {
  try {
    const deletedProduct = await prisma.product.delete({
      where: { id: product.id },
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
}: searchParams): Promise<response<Product[]>> => {
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

    return {
      success: true,
      data: await Promise.all(result.map(prismaToProduct)),
    };
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};
