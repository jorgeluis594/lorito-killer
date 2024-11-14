import prisma from "@/lib/prisma";
import {
  KG_UNIT_TYPE,
  PackageProduct,
  PackageProductType,
  Photo,
  Product,
  ProductSearchParams,
  ProductSortParams,
  SingleProduct,
  SingleProductType,
  TypePackageProductType,
  TypeSingleProductType,
  UNIT_UNIT_TYPE,
} from "./types";
import { response } from "@/lib/types";
import {
  $Enums,
  Category as PrismaCategory,
  Prisma,
  Product as PrismaProduct,
} from "@prisma/client";

interface searchParams {
  q: string;
  categoryId?: string | null;
}

export const UNIT_TYPE_MAPPER: Record<
  $Enums.UnitType,
  typeof KG_UNIT_TYPE | typeof UNIT_UNIT_TYPE
> = {
  KG: KG_UNIT_TYPE,
  UNIT: UNIT_UNIT_TYPE,
} as const;

export const PRISMA_UNIT_TYPE_MAPPER: Record<
  typeof KG_UNIT_TYPE | typeof UNIT_UNIT_TYPE,
  $Enums.UnitType
> = {
  kg: "KG",
  unit: "UNIT",
} as const;

const singleProductToPrisma = (
  product: SingleProduct,
): Prisma.ProductCreateInput => {
  const { type, id, photos, categories, stockConfig, ...data } = product;

  return {
    ...data,
    sku: product.sku || null,
    isPackage: false,
    price: new Prisma.Decimal(product.price),
    unitType: PRISMA_UNIT_TYPE_MAPPER[product.unitType],
    purchasePrice: product.purchasePrice
      ? new Prisma.Decimal(product.purchasePrice)
      : null,
    stock: new Prisma.Decimal(product.stock),
    targetMovementProductId: stockConfig ? stockConfig.productId : null,
    targetMovementProductStock: stockConfig
      ? new Prisma.Decimal(stockConfig.quantity)
      : null,
  };
};

const createSingleProduct = async (
  product: SingleProduct,
): Promise<response<SingleProduct>> => {
  try {
    const { photos, categories, ...productData } = product;

    const createdResponse = await prisma().product.create({
      data: singleProductToPrisma(product),
    });
    const purchasePrice = !!createdResponse.purchasePrice
      ? createdResponse.purchasePrice.toNumber()
      : 0;

    const productCategories = await prisma().category.findMany({
      where: { id: { in: categories.map((c) => c.id!) } },
    });

    const createdProduct: SingleProduct = {
      ...createdResponse,
      companyId: createdResponse.companyId || "some_company_id",
      type: SingleProductType,
      sku: createdResponse.sku || undefined,
      stock: createdResponse.stock!.toNumber(),
      price: createdResponse.price.toNumber(),
      purchasePrice: purchasePrice,
      unitType: createdResponse.unitType
        ? UNIT_TYPE_MAPPER[createdResponse.unitType]
        : UNIT_UNIT_TYPE, // Created single product is expected to have a unit type by default
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
  const { type, productItems, categories, photos, ...data } = product;
  let sku: string | null;

  if (product.sku === undefined) {
    sku = null;
  } else {
    sku = product.sku;
  }

  return {
    ...data,
    sku,
    isPackage: true,
  };
};

const createPackageProduct = async (
  product: PackageProduct,
): Promise<response<PackageProduct>> => {
  try {
    const { photos, categories, ...productData } = product;

    const createdResponse = await prisma().product.create({
      data: packageProductToPrisma(product),
    });

    const packageItems = await Promise.all(
      product.productItems.map((item) =>
        prisma().packageItem.create({
          data: {
            id: item.id,
            parentProductId: createdResponse.id,
            childProductId: item.productId,
            quantity: item.quantity,
          },
        }),
      ),
    );

    const productCategories = await prisma().category.findMany({
      where: { id: { in: categories.map((c) => c.id!) } },
    });

    const createdProduct: PackageProduct = {
      ...createdResponse,
      companyId: createdResponse.companyId || "some_company_id",
      type: PackageProductType,
      sku: createdResponse.sku || undefined,
      price: createdResponse.price.toNumber(),
      productItems: [...product.productItems],
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
  const response = await (product.type === SingleProductType
    ? createSingleProduct(product)
    : createPackageProduct(product));

  if (!response.success) return response;

  await prisma().product.update({
    where: { id: response.data.id },
    data: {
      photos: product.photos ? { create: product.photos } : undefined,
      categories: product.categories
        ? { connect: product.categories.map((c) => ({ id: c.id })) }
        : undefined,
    },
  });

  return { success: true, data: { ...response.data, ...product } };
};

export const getTotal = async ({
  companyId,
}: {
  companyId: string;
}): Promise<response<number>> => {
  const total = await prisma().product.count({ where: { companyId } });
  return { success: true, data: total };
};

const updateSingleProduct = async (
  product: SingleProduct,
): Promise<response<SingleProduct>> => {
  const { photos, categories, type, ...productData } = product;

  try {
    await prisma().product.update({
      where: { id: product.id },
      data: singleProductToPrisma(product),
    });
    return { success: true, data: { ...product } };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

const updatePackageProduct = async (
  product: PackageProduct,
): Promise<response<PackageProduct>> => {
  const { photos, categories, type, productItems, ...productData } = product;

  try {
    await prisma().product.update({
      where: { id: product.id },
      data: packageProductToPrisma(product),
    });

    const previewItems = await prisma().packageItem.findMany({
      where: { parentProductId: product.id },
    });

    const itemsToDelete = previewItems.filter(
      (item) => !product.productItems.find((i) => i.id === item.id),
    );

    await prisma().packageItem.deleteMany({
      where: { id: { in: itemsToDelete.map((i) => i.id) } },
    });

    await Promise.all(
      product.productItems.map((item) =>
        prisma().packageItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            parentProductId: product.id!,
            childProductId: item.productId,
            quantity: item.quantity,
          },
          update: { quantity: item.quantity, childProductId: item.productId },
        }),
      ),
    );

    return { success: true, data: { ...product } };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const update = async (product: Product): Promise<response<Product>> => {
  return product.type === SingleProductType
    ? updateSingleProduct(product)
    : updatePackageProduct(product);
};

const prismaToProduct = async (
  prismaProduct: PrismaProduct & { categories: PrismaCategory[] },
): Promise<Product> => {
  if (prismaProduct.isPackage) {
    const productItems = await prisma().packageItem.findMany({
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
        id: item.id,
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
      : 0;
    return {
      ...prismaProduct,
      companyId: prismaProduct.companyId || "some_company_id",
      type: SingleProductType,
      sku: prismaProduct.sku || undefined,
      stock: prismaProduct.stock!.toNumber(),
      unitType: prismaProduct.unitType
        ? UNIT_TYPE_MAPPER[prismaProduct.unitType]
        : UNIT_UNIT_TYPE, // Single product is expected to have a unit type by default
      price,
      categories: prismaProduct.categories.map((c) => ({
        ...c,
        companyId: c.companyId || "some_company_id",
      })),
      stockConfig:
        prismaProduct.targetMovementProductId &&
        prismaProduct.targetMovementProductStock
          ? {
              productId: prismaProduct.targetMovementProductId,
              quantity: prismaProduct.targetMovementProductStock.toNumber(),
            }
          : undefined,
      purchasePrice,
    };
  }
};

export type GetManyParams = {
  companyId: string;
  sortBy?: ProductSortParams;
  categoryId?: searchParams["categoryId"];
  limit?: number;
  pageNumber?: number;
  q?: string | null;
  productType?: TypeSingleProductType | TypePackageProductType;
};

export const getMany = async ({
  companyId,
  sortBy,
  categoryId,
  limit,
  pageNumber,
  q,
  productType,
}: GetManyParams): Promise<response<Product[]>> => {
  try {
    const query: Prisma.ProductFindManyArgs = {
      where: { companyId },
      orderBy: sortBy ? [{ ...sortBy }, { stock: "desc" }] : { stock: "desc" },
    };

    if (productType)
      query.where = {
        ...query.where,
        isPackage: productType === PackageProductType,
      };

    if (categoryId)
      query.where = {
        ...query.where,
        categories: { some: { id: categoryId } },
      };
    if (limit) query.take = limit;
    if (pageNumber && limit) query.skip = (pageNumber - 1) * limit;
    if (q) {
      const searchValues: string[] = q
        .split(" ")
        .filter((v) => v && v.length > 0);
      query.where = {
        ...query.where,
        name: { search: searchValues.join(" & ") },
      };
    }

    const result = await prisma().product.findMany({
      ...query,
      include: { photos: true, categories: true },
    });
    const products = await Promise.all(result.map(prismaToProduct));

    return { success: true, data: products };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const find = async (
  id: string,
  companyId?: string,
): Promise<response<Product>> => {
  try {
    const product = await prisma().product.findUnique({
      where: { id, companyId },
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

    const product = await prisma().product.findFirst({
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
    const deletedProduct = await prisma().product.delete({
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
    const photos = await prisma().photo.findMany({ where: { productId } });
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
    const photo = await prisma().photo.findUnique({ where: { id: photoId } });
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
        prisma().photo.create({
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
    await prisma().photo.delete({
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

    const result = await prisma().product.findMany({
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

export const orderByProductIdCount = async (
  productId: string,
): Promise<response<number>> => {
  try {
    const count = await prisma().orderItem.count({ where: { productId } });
    return { success: true, data: count };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
