"use server";

import { find, update, getParentPackages } from "@/product/db_repository";
import { response } from "@/lib/types";
import { Product } from "@/product/types";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";

export const hideProduct = async (
  productId: string,
): Promise<response<Product>> => {
  const { user } = await getSession();
  if (!user) {
    return { success: false, message: "No hay usuario autenticado" };
  }

  const productResponse = await find(productId, user.companyId);
  if (!productResponse.success) return productResponse;

  const parentPackagesResponse = await getParentPackages(productId);
  if (!parentPackagesResponse.success) return parentPackagesResponse;

  if (parentPackagesResponse.data.length > 0) {
    const packageNames = parentPackagesResponse.data
      .map((pkg) => pkg.name)
      .join(", ");
    return {
      success: false,
      message: `El producto está dentro de un paquete: ${packageNames}`,
    };
  }

  const updatedProduct = { ...productResponse.data, hidden: true };
  const updateResponse = await update(updatedProduct);

  if (updateResponse.success) {
    revalidatePath("/[subdomain]/dashboard/products", "page");
  }

  return updateResponse;
};
