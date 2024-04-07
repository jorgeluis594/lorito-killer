import { create, findBy, getMany } from "@/product/db_repository";
import productCreator from "@/product/use-cases/product-creator";
import { Product, ProductSortParams, SortKey } from "@/product/types";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sortOptions } from "@/product/constants";

export async function POST(req: Request) {
  const data = (await req.json()) as Product;

  const response = await productCreator({ create, findBy }, data);
  if (response.success) {
    revalidatePath("/api/products");
  }

  return NextResponse.json(response, { status: response.success ? 201 : 400 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const param = searchParams.get("param");
  const categoryId = searchParams.get("categoryId");
  const sortKey = searchParams.get("sortBy") as SortKey | null;
  let sortBy: ProductSortParams =
    sortKey && sortOptions[sortKey]
      ? sortOptions[sortKey]!.value
      : { createdAt: "desc" };

  const response = await getMany({
    q: param,
    sortBy: sortBy,
    categoryId,
  });

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
