import { ProductSearchParams, SingleProduct } from "@/product/types";
import { SingleProductSchema } from "@/product/schema";
import { response } from "@/lib/types";

interface Repository {
  create: (product: SingleProduct) => Promise<response<SingleProduct>>;
  findBy: (params: ProductSearchParams) => Promise<response<SingleProduct>>;
}

export default async function productCreator(
  repository: Repository,
  product: SingleProduct,
): Promise<response<SingleProduct>> {
  const parsedProduct = SingleProductSchema.safeParse(product);
  if (!parsedProduct.success) {
    return { success: false, message: parsedProduct.error.message };
  }

  if (!product.sku) {
    return repository.create(product);
  }

  const { success: productFound } = await repository.findBy({
    sku: product.sku,
    companyId: product.companyId,
  });

  if (productFound) {
    return { success: false, message: "Ya existe un producto con el sku" };
  }

  return repository.create(product);
}
