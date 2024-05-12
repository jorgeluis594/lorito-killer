import {
  find as findProduct,
  update as UpdateProduct,
  deleteProduct,
  findBy,
} from "@/product/db_repository";
import { Product } from "@/product/types";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  const productData = (await req.json()) as Product;

  const { success } = await findProduct(params.id, session.user.companyId);
  if (!success) {
    return NextResponse.json(
      { success: false, message: "Product not found" },
      { status: 404 },
    );
  }

  const response = await findBy({ sku: productData.sku });
  if (response.success && response.data.id !== productData.id) {
    return NextResponse.json({
      success: false,
      message: "Ya existe un producto con el sku",
    });
  }

  const updateResponse = await UpdateProduct(productData);
  revalidatePath("/products/" + params.id);
  return NextResponse.json(updateResponse, {
    status: updateResponse.success ? 200 : 400,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  const findProductResponse = await findProduct(
    params.id,
    session.user.companyId,
  );
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
  const session = await getSession();
  let response = await findProduct(params.id, session.user.companyId);
  if (!response.success) {
    response = await findBy({
      sku: params.id,
      companyId: session.user.companyId,
    });
  }

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
