import { create, findBy } from "@/product/db_repository";
import productCreator from "@/product/use-cases/product-creator";
import { Product } from "@/product/types";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const data = (await req.json()) as Product;

  const response = await productCreator({ create, findBy }, data);
  return NextResponse.json(response, { status: response.success ? 201 : 400 });
}
