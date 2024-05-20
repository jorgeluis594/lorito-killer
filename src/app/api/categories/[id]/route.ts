import {
    deleteCategory,
    find as findCategory,
  } from "@/category/db_respository";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } },
  ) {
    const session = await getSession();
    const findCategoryResponse = await findCategory(
      params.id,
    );
    if (!findCategoryResponse.success) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 },
      );
    }
  
    revalidatePath("/api/categories");
  
    const response = await deleteCategory(findCategoryResponse.data);
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
  }