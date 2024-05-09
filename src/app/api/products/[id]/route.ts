import {
  find as findProduct,
  update as UpdateProduct,
  deleteProduct,
  findBy,
} from "@/product/db_repository";
import { Product } from "@/product/types";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const productData = (await req.json()) as Product;
  const { success } = await findProduct(params.id);
  if (!success) {
    return NextResponse.json(
      { success: false, message: "Product not found" },
      { status: 404 },
    );
  }

  const responsed = await findBy({ sku: productData.sku });
  if (responsed.success && responsed.data.id !== productData.id) {
    return NextResponse.json({ success: false, message: "Ya existe un producto con el sku" });
  }

  const response = await UpdateProduct(productData);
  revalidatePath("/products/" + params.id);
  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const findProductResponse = await findProduct(params.id);
  if (!findProductResponse.success) {
    return NextResponse.json(
      { success: false, message: "Product not found" },
      { status: 404 },
    );
  }

  revalidatePath("/api/products");

  const response = await deleteProduct(findProductResponse.data);
  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  let response = await findProduct(params.id);
  if (!response.success) {
    response = await findBy({ sku: params.id });
  }

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
