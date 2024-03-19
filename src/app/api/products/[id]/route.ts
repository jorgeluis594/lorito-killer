import {
  find as findProduct,
  update as UpdateProduct,
  deleteProduct,
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

  const response = await UpdateProduct(productData);
  if (response.success) {
    revalidatePath("/products");
  }
  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { success, data: product } = await findProduct(params.id);
  if (!success || !product) {
    return NextResponse.json(
      { success: false, message: "Product not found" },
      { status: 404 },
    );
  }

  const response = await deleteProduct(product);
  if (response.success) {
    revalidatePath("/products");
  }

  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}
