import { create, findBy, getMany } from "@/product/db_repository";
import productCreator from "@/product/use-cases/product-creator";
import { Product } from "@/product/types";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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

  const response = await getMany({
    q: param,
    sortBy: { createdAt: "desc" },
    categoryId,
  });

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
