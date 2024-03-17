import { create as createProduct } from "@/product/db_repository"
import { Product } from "@/product/types"
import {NextResponse} from "next/server";

export async function POST(req: Request) {
  const data = await req.json() as Product
  const response = await createProduct(data)

  return NextResponse.json(response, { status: response.success ? 201 : 400 })
}