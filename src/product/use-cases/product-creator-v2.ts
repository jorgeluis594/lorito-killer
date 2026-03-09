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
  ServiceProductSchema
} from "@/product/schema";
import { response } from "@/lib/types";

interface Repository {
  create: (product: Product) => Promise<response<Product>>;
  findBy: (params: ProductSearchParams) => Promise<response<Product>>;
}

// Pure function to validate product based on type
const validateProduct = (product: Product): response<Product> => {
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

  return { success: true, data: product };
};

// Pure function to check if SKU validation is needed
const needsSkuValidation = (product: Product): boolean => {
  return Boolean(product.sku && product.sku.length > 0);
};

// Async function to validate SKU uniqueness
const validateSkuUniqueness = (repository: Repository) =>
  async (product: Product): Promise<response<Product>> => {
    if (!needsSkuValidation(product)) {
      return { success: true, data: product };
    }

    const { success: productFound } = await repository.findBy({
      sku: product.sku,
      companyId: product.companyId,
    });

    if (productFound) {
      return { success: false, message: "Ya existe un producto con el sku" };
    }

    return { success: true, data: product };
  };

// Function composition utility for response types
const pipeResponse = <T>(
  ...fns: Array<(arg: T) => response<T> | Promise<response<T>>>
) =>
  async (value: T): Promise<response<T>> => {
    let result: response<T> = { success: true, data: value };

    for (const fn of fns) {
      if (!result.success) break;

      const fnResult = await fn(result.data);
      if (!fnResult.success) {
        return fnResult;
      }
      result = fnResult;
    }

    return result;
  };

// Main product creator function using composition
export default function productCreatorV2(repository: Repository) {
  return async (product: Product): Promise<response<Product>> => {
    // Compose validation pipeline
    const validatePipeline = pipeResponse(
      validateProduct,
      validateSkuUniqueness(repository)
    );

    // Execute validation pipeline
    const validationResult = await validatePipeline(product);

    if (!validationResult.success) {
      return validationResult;
    }

    // Create the product
    return repository.create(validationResult.data);
  };
}
