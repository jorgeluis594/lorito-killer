import { create, findBy, getMany } from "@/product/db_repository";
import productCreator from "@/product/use-cases/product-creator";
import {
  PackageProductType,
  Product,
  ProductSortParams,
  SingleProductType,
  SortKey,
  TypePackageProductType,
  TypeSingleProductType,
} from "@/product/types";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sortOptions } from "@/product/constants";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function POST(req: Request) {
  const data: Product = await req.json();

  const response = await productCreator({ create, findBy }, data);
  if (response.success) {
    revalidatePath("/api/products");
  }

  return NextResponse.json(response, { status: response.success ? 201 : 400 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { user } = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401 },
    );
  }

  const param = searchParams.get("param");
  const categoryId = searchParams.get("categoryId");
  const sortKey = searchParams.get("sortBy") as SortKey | null;
  const limit = searchParams.get("limit");
  const productType = searchParams.get("productType") || undefined;

  let sortBy: ProductSortParams =
    sortKey && sortOptions[sortKey]
      ? sortOptions[sortKey]!.value
      : { createdAt: "desc" };

  const response = await getMany({
    q: param,
    companyId: user.companyId,
    sortBy: sortBy,
    limit: limit ? parseInt(limit) : undefined,
    categoryId,
    productType: ensureProductType(productType),
  });

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}

const ensureProductType = (
  type?: string,
): TypePackageProductType | TypeSingleProductType | undefined => {
  return type === SingleProductType || type === PackageProductType
    ? type
    : undefined;
};
