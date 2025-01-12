import {
  find as findProduct,
  update as UpdateProduct,
  deleteProduct,
  findBy,
  orderByProductIdCount,
} from "@/product/db_repository";
import { SingleProduct } from "@/product/types";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import productRemoverCreator from "@/product/use-cases/product-remover";
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401 },
    );
  }
  const productData: SingleProduct = await req.json();

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

  if (productData.sku && productData.sku.length) {
    const response = await findBy({ sku: productData.sku });
    if (response.success && response.data.id !== productData.id) {
      return NextResponse.json({
        success: false,
        message: "Ya existe un producto con el sku",
      });
    }
  } else if (productData.sku === "") {
    productData.sku = undefined;
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
  if (!session.user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401 },
    );
  }
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

  const response = await productRemoverCreator(
    deleteProduct,
    orderByProductIdCount,
  )(findProductResponse.data);
  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401 },
    );
  }

  let response = await findProduct(params.id, session.user.companyId);
  if (!response.success) {
    response = await findBy({
      sku: params.id,
      companyId: session.user.companyId,
    });
  }

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
