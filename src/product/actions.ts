"use server";

import { find, update, getParentPackages, create, findBy } from "@/product/db_repository";
import { response } from "@/lib/types";
import { Product, ProductService } from "@/product/types";
import { revalidatePath } from "next/cache";
import { protectedAction } from "@/authorization/server";
import productCreatorV2 from "@/product/use-cases/product-creator-v2";

const createProduct = productCreatorV2({ create, findBy });

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

export const createServiceProduct = protectedAction(
  { resource: "products", action: "create" },
  async (user, data: ProductService): Promise<response<ProductService>> => {
    try {
      const serviceProduct: ProductService = {
        ...data,
        companyId: user.companyId,
      };

      const response = await createProduct(serviceProduct);

      if (response.success) {
        revalidatePath("/dashboard/products");
        revalidatePath("/api/products");
      }

      return response as response<ProductService>;
    } catch (error) {
      console.error("Error creating service product:", error);
      return {
        success: false,
        message: "Error interno del servidor al crear el servicio",
      };
    }
  },
);
