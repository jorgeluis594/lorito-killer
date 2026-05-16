import prisma from "@/lib/prisma";
import {
  KG_UNIT_TYPE,
  PackageProduct,
  PackageProductType,
  Photo,
  Product,
  ProductService,
  ServiceProductType,
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
    productType: "SINGLE_PRODUCT",
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
    productType: "PACKAGE_PRODUCT",
  };
};

const serviceProductToPrisma = (
  product: ProductService,
): Prisma.ProductCreateInput => {
  const { type, photos, categories, ...data } = product;

  return {
    ...data,
    sku: product.sku || null,
    productType: "SERVICE_PRODUCT",
    price: new Prisma.Decimal(product.price),
    stock: null,
    unitType: null,
    purchasePrice: null,
  };
};

const createServiceProduct = async (
  product: ProductService,
): Promise<response<ProductService>> => {
  try {
    const { photos, categories, ...productData } = product;

    const createdResponse = await prisma().product.create({
      data: serviceProductToPrisma(product),
    });

    const productCategories = await prisma().category.findMany({
      where: { id: { in: categories.map((c) => c.id!) } },
    });

    const createdProduct: ProductService = {
      ...createdResponse,
      companyId: createdResponse.companyId || "some_company_id",
      type: ServiceProductType,
      sku: createdResponse.sku || undefined,
      price: createdResponse.price.toNumber(),
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
  let response: response<Product>;

  if (product.type === SingleProductType) {
    response = await createSingleProduct(product);
  } else if (product.type === PackageProductType) {
    response = await createPackageProduct(product);
  } else if (product.type === ServiceProductType) {
    response = await createServiceProduct(product);
  } else {
    return { success: false, message: "Invalid product type" };
  }

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

const updateServiceProduct = async (
  product: ProductService,
): Promise<response<ProductService>> => {
  const { photos, categories, type, ...productData } = product;

  try {
    await prisma().product.update({
      where: { id: product.id },
      data: serviceProductToPrisma(product),
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
  if (product.type === SingleProductType) {
    return updateSingleProduct(product);
  } else if (product.type === PackageProductType) {
    return updatePackageProduct(product);
  } else if (product.type === ServiceProductType) {
    return updateServiceProduct(product);
  } else {
    return { success: false, message: "Invalid product type" };
  }
};

const prismaToProduct = async (
  prismaProduct: PrismaProduct & { categories: PrismaCategory[] },
): Promise<Product> => {
  if (prismaProduct.productType === "SERVICE_PRODUCT") {
    return {
      ...prismaProduct,
      companyId: prismaProduct.companyId || "some_company_id",
      type: ServiceProductType,
      sku: prismaProduct.sku || undefined,
      price: prismaProduct.price.toNumber(),
      categories: prismaProduct.categories.map((c) => ({
        ...c,
        companyId: c.companyId || "some_company_id",
      })),
    };
  } else if (prismaProduct.productType === "PACKAGE_PRODUCT") {
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
  includeHidden?: boolean;
};

type ProductSearchIdRow = {
  id: string;
};

const normalizeProductSearchQuery = (q?: string | null) => {
  const normalized = q?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const buildProductPrefixSearchQuery = (q: string) => {
  const tokens = q.match(/[\p{L}\p{N}_]+/gu) ?? [];
  const prefixTokens = tokens.map((token) => `${token}:*`);

  return prefixTokens.length > 0 ? prefixTokens.join(" & ") : null;
};

const productTypeToPrisma = (
  productType?: TypeSingleProductType | TypePackageProductType,
) => {
  if (!productType) return undefined;

  return productType === PackageProductType
    ? "PACKAGE_PRODUCT"
    : "SINGLE_PRODUCT";
};

const SQL_ORDERABLE_PRODUCT_COLUMNS = {
  companyId: Prisma.sql`p."companyId"`,
  name: Prisma.sql`p."name"`,
  price: Prisma.sql`p."price"`,
  sku: Prisma.sql`p."sku"`,
  description: Prisma.sql`p."description"`,
  updatedAt: Prisma.sql`p."updatedAt"`,
  createdAt: Prisma.sql`p."createdAt"`,
  hidden: Prisma.sql`p."hidden"`,
  productType: Prisma.sql`p."productType"`,
  unitType: Prisma.sql`p."unitType"`,
  purchasePrice: Prisma.sql`p."purchasePrice"`,
  stock: Prisma.sql`p."stock"`,
} satisfies Record<string, Prisma.Sql>;

const buildProductSearchOrderBy = (sortBy?: ProductSortParams) => {
  const orderBy: Prisma.Sql[] = [];

  if (sortBy) {
    for (const [key, direction] of Object.entries(sortBy)) {
      const column =
        SQL_ORDERABLE_PRODUCT_COLUMNS[
          key as keyof typeof SQL_ORDERABLE_PRODUCT_COLUMNS
        ];

      if (!column || (direction !== "asc" && direction !== "desc")) continue;

      orderBy.push(
        direction === "asc"
          ? Prisma.sql`${column} ASC`
          : Prisma.sql`${column} DESC`,
      );
    }
  }

  orderBy.push(Prisma.sql`p."stock" DESC`);

  return Prisma.join(orderBy, ", ");
};

const findProductIdsBySearchVectorQuery = async ({
  companyId,
  sortBy,
  categoryId,
  limit,
  pageNumber,
  searchQuery,
  productType,
  includeHidden,
}: Omit<GetManyParams, "q"> & { searchQuery: Prisma.Sql }) => {
  const where: Prisma.Sql[] = [
    Prisma.sql`p."companyId" = ${companyId}`,
    Prisma.sql`p."searchVector" @@ search_query.value`,
  ];
  const prismaProductType = productTypeToPrisma(productType);

  if (!includeHidden) {
    where.push(Prisma.sql`p."hidden" = false`);
  }

  if (prismaProductType) {
    where.push(Prisma.sql`p."productType"::text = ${prismaProductType}`);
  }

  if (categoryId) {
    where.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "_CategoryToProduct" category_product
        WHERE category_product."A" = ${categoryId}
          AND category_product."B" = p."id"
      )`,
    );
  }

  const offset = pageNumber && limit ? (pageNumber - 1) * limit : undefined;

  return prisma().$queryRaw<ProductSearchIdRow[]>(Prisma.sql`
    WITH search_query AS (
      ${searchQuery}
    )
    SELECT p."id"
    FROM "Product" p, search_query
    WHERE ${Prisma.join(where, " AND ")}
    ORDER BY ${buildProductSearchOrderBy(sortBy)}
    ${limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty}
    ${offset ? Prisma.sql`OFFSET ${offset}` : Prisma.empty}
  `);
};

const findProductIdsBySearchVector = async ({
  q,
  ...params
}: GetManyParams & { q: string }) => {
  return findProductIdsBySearchVectorQuery({
    ...params,
    searchQuery: Prisma.sql`SELECT websearch_to_tsquery('simple', unaccent(${q})) AS value`,
  });
};

const findProductIdsBySearchVectorPrefix = async ({
  q,
  ...params
}: GetManyParams & { q: string }) => {
  const prefixSearchQuery = buildProductPrefixSearchQuery(q);

  if (!prefixSearchQuery) return [];

  return findProductIdsBySearchVectorQuery({
    ...params,
    searchQuery: Prisma.sql`SELECT to_tsquery('simple', unaccent(${prefixSearchQuery})) AS value`,
  });
};

const buildProductWhere = ({
  companyId,
  categoryId,
  productType,
  includeHidden,
}: Pick<
  GetManyParams,
  "companyId" | "categoryId" | "productType" | "includeHidden"
>): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = { companyId };

  if (!includeHidden) {
    where.hidden = false;
  }

  const prismaProductType = productTypeToPrisma(productType);

  if (prismaProductType) {
    where.productType = prismaProductType;
  }

  if (categoryId) {
    where.categories = { some: { id: categoryId } };
  }

  return where;
};

const findProductsByPartialSearch = async ({
  q,
  companyId,
  sortBy,
  categoryId,
  limit,
  pageNumber,
  productType,
  includeHidden,
}: GetManyParams & { q: string }) => {
  const query = {
    where: {
      ...buildProductWhere({
        companyId,
        categoryId,
        productType,
        includeHidden,
      }),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: sortBy ? [{ ...sortBy }, { stock: "desc" }] : { stock: "desc" },
    include: { photos: true, categories: true },
    ...(limit ? { take: limit } : {}),
    ...(pageNumber && limit ? { skip: (pageNumber - 1) * limit } : {}),
  } satisfies Prisma.ProductFindManyArgs;

  return prisma().product.findMany(query);
};

export const getMany = async ({
  companyId,
  sortBy,
  categoryId,
  limit,
  pageNumber,
  q,
  productType,
  includeHidden,
}: GetManyParams): Promise<response<Product[]>> => {
  try {
    const normalizedSearchQuery = normalizeProductSearchQuery(q);

    if (normalizedSearchQuery) {
      let rows = await findProductIdsBySearchVector({
        companyId,
        sortBy,
        categoryId,
        limit,
        pageNumber,
        q: normalizedSearchQuery,
        productType,
        includeHidden,
      });

      if (rows.length === 0) {
        rows = await findProductIdsBySearchVectorPrefix({
          companyId,
          sortBy,
          categoryId,
          limit,
          pageNumber,
          q: normalizedSearchQuery,
          productType,
          includeHidden,
        });
      }

      const ids = rows.map((row) => row.id);

      if (ids.length === 0) {
        const result = await findProductsByPartialSearch({
          companyId,
          sortBy,
          categoryId,
          limit,
          pageNumber,
          q: normalizedSearchQuery,
          productType,
          includeHidden,
        });
        const products = await Promise.all(result.map(prismaToProduct));

        return { success: true, data: products };
      }

      const result = await prisma().product.findMany({
        where: { id: { in: ids } },
        include: { photos: true, categories: true },
      });
      const productById = new Map(
        result.map((product) => [product.id, product]),
      );
      const orderedResult = ids.flatMap((id) => {
        const product = productById.get(id);
        return product ? [product] : [];
      });
      const products = await Promise.all(orderedResult.map(prismaToProduct));

      return { success: true, data: products };
    }

    const query: Prisma.ProductFindManyArgs = {
      where: buildProductWhere({
        companyId,
        categoryId,
        productType,
        includeHidden,
      }),
      orderBy: sortBy ? [{ ...sortBy }, { stock: "desc" }] : { stock: "desc" },
    };

    if (limit) query.take = limit;
    if (pageNumber && limit) query.skip = (pageNumber - 1) * limit;
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
      productType: "SINGLE_PRODUCT",
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

export const getParentPackages = async (
  productId: string,
): Promise<response<{ id: string; name: string }[]>> => {
  try {
    const packageItems = await prisma().packageItem.findMany({
      where: { childProductId: productId },
      include: { parentProduct: true },
    });
    const packages = packageItems.map((item) => ({
      id: item.parentProduct.id,
      name: item.parentProduct.name,
    }));
    return { success: true, data: packages };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
