import { find as findProduct, update as UpdateProduct } from "@/product/db_repository";
import { Product } from "@/product/types";
import {NextResponse} from "next/server";
export async function PUT(req: Request, params: { id: string}) {
  const productData = await req.json() as Product
  const {success} = await findProduct(params.id)
  if (!success) {
    return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 })
  }

  const response = await UpdateProduct(productData)
  return NextResponse.json(response, { status: response.success ? 200 : 400 })
}