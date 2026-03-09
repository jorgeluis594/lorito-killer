"use server";

import { find, update, getParentPackages } from "@/product/db_repository";
import { response } from "@/lib/types";
import { Product } from "@/product/types";
import { revalidatePath } from "next/cache";
import { protectedAction } from "@/authorization/server";

export const hideProduct = protectedAction(
  { resource: "products", action: "delete" },
  async (user, productId: string): Promise<response<Product>> => {
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
  },
);
