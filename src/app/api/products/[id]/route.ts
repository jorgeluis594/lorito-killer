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
import { protectedRoute } from "@/authorization/server";
import productRemoverCreator from "@/product/use-cases/product-remover";

export const PUT = protectedRoute(
  { resource: "products", action: "update" },
  async (req, user) => {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop()!;
    const productData: SingleProduct = await req.json();

    const findProductResponse = await findProduct(id, user.companyId);
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
    revalidatePath("/products/" + id);
    return NextResponse.json(updateResponse, {
      status: updateResponse.success ? 200 : 400,
    });
  },
);

export const DELETE = protectedRoute(
  { resource: "products", action: "delete" },
  async (req, user) => {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop()!;

    const findProductResponse = await findProduct(id, user.companyId);
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
    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  },
);

export const GET = protectedRoute(
  { resource: "products", action: "read" },
  async (req, user) => {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop()!;

    let response = await findProduct(id, user.companyId);
    if (!response.success) {
      response = await findBy({
        sku: id,
        companyId: user.companyId,
      });
    }

    return NextResponse.json(response, {
      status: response.success ? 200 : 404,
    });
  },
);
