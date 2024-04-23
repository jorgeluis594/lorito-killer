import { Product, ProductSearchParams } from "@/product/types";
import { ProductSchema } from "@/product/schema";
import { response } from "@/lib/types";

interface Repository {
  create: (product: Product) => Promise<response<Product>>;
  findBy: (params: ProductSearchParams) => Promise<response<Product>>;
}

export default async function productCreator(
  repository: Repository,
  product: Product,
): Promise<response<Product>> {
  const parsedProduct = ProductSchema.safeParse(product);
  if (!parsedProduct.success) {
    return { success: false, message: parsedProduct.error.message };
  }

  if (!product.sku) {
    return repository.create(product);
  }

  const { success: productFound } = await repository.findBy({
    sku: product.sku,
  });

  if (productFound) {
    return { success: false, message: "Ya existe un producto con el sku" };
  }

  return repository.create(product);
}
