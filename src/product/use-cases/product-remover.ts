import { Product } from "@/product/types";
import { response } from "@/lib/types";
import { log } from "@/lib/log";

export type ProductRemover = (product: Product) => Promise<response<Product>>;

type RemoveRepository = (product: Product) => Promise<response<Product>>;
type OrderByProductIdCount = (productId: string) => Promise<response<number>>;

export default function productRemoverCreator(
  removeRepository: RemoveRepository,
  orderByProductIdCount: OrderByProductIdCount,
): ProductRemover {
  return async (product: Product): Promise<response<Product>> => {
    const orderCountResponse = await orderByProductIdCount(product.id!);
    if (!orderCountResponse.success) {
      return orderCountResponse;
    }

    if (orderCountResponse.data > 0) {
      return { success: false, message: "El producto tiene ventas" };
    }

    const deleteResponse = await removeRepository(product);

    if (!deleteResponse.success) {
      log.error("delete_product_failed", { deleteResponse, product });

      return {
        success: false,
        message: "Error al eliminar el producto, comuniquese con soporte",
      };
    }

    return deleteResponse;
  };
}
