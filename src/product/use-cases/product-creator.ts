import {
  Product,
  ProductSearchParams,
  SingleProductType,
  PackageProductType,
  ServiceProductType,
} from "@/product/types";
import {
  PackageProductSchema,
  SingleProductSchema,
  ServiceProductSchema,
} from "@/product/schema";
import { response } from "@/lib/types";

interface Repository {
  create: (product: Product) => Promise<response<Product>>;
  findBy: (params: ProductSearchParams) => Promise<response<Product>>;
}

export default async function productCreator(
  repository: Repository,
  product: Product,
): Promise<response<Product>> {
  let parsedProduct;

  switch (product.type) {
    case SingleProductType:
      parsedProduct = SingleProductSchema.safeParse(product);
      break;
    case PackageProductType:
      parsedProduct = PackageProductSchema.safeParse(product);
      break;
    case ServiceProductType:
      parsedProduct = ServiceProductSchema.safeParse(product);
      break;
    default:
      return { success: false, message: "Tipo de producto no válido" };
  }

  if (!parsedProduct.success) {
    return { success: false, message: parsedProduct.error.message };
  }

  if (!product.sku) {
    return repository.create(product);
  }

  if (product.sku && product.sku.length) {
    const { success: productFound } = await repository.findBy({
      sku: product.sku,
      companyId: product.companyId,
    });

    if (productFound) {
      return { success: false, message: "Ya existe un producto con el sku" };
    }
  }

  return repository.create(product);
}
