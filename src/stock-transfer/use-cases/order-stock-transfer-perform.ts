import { OrderStockTransfer, StockUpdate } from "@/stock-transfer/types";
import { Order, OrderItem } from "@/order/types";
import {
  PackageProduct,
  PackageProductType,
  Product,
  SingleProduct,
} from "@/product/types";
import { response, successResponse } from "@/lib/types";

interface Repository {
  findProduct: (productId: string) => Promise<response<Product>>;
  updateProduct: (product: Product) => Promise<response<Product>>;
}

export const orderStockTransferGenerator = async (
  orderItem: OrderItem,
  repository: Repository,
): Promise<response<OrderStockTransfer[]>> => {
  const productFoundResponse = await repository.findProduct(
    orderItem.productId,
  );
  if (!productFoundResponse.success) {
    return productFoundResponse;
  }

  const product = productFoundResponse.data;
  let stockTransfers: OrderStockTransfer[] = [];
  if (product.type == PackageProductType) {
    stockTransfers = generatePackageProductStockTransfers(orderItem, product);
  } else {
    stockTransfers = generateSingleProductStockTransfers(orderItem, product);
  }

  return { success: false, message: "Not implemented" };
};

const generatePackageProductStockTransfers = (
  orderItem: OrderItem,
  product: PackageProduct,
): OrderStockTransfer[] => {
  return product.productItems.map((productItem) => ({
    id: crypto.randomUUID(),
    orderItemId: orderItem.id!,
    value: -1 * (orderItem.quantity * productItem.quantity),
    fromProductId: productItem.id!,
    type: OrderStockTransfer,
  }));
};

const generateSingleProductStockTransfers = (
  orderItem: OrderItem,
  product: SingleProduct,
): OrderStockTransfer[] => {
  return [
    {
      id: crypto.randomUUID(),
      orderItemId: orderItem.id!,
      value: -1 * orderItem.quantity,
      fromProductId: product.id!,
      type: OrderStockTransfer,
    },
  ];
};

const performStockTransfers = async (
  stockTransfers: OrderStockTransfer[],
  repository: Repository,
): Promise<response<undefined>> => {
  const productFoundResponses = await Promise.all(
    stockTransfers.map((st) => repository.findProduct(st.fromProductId)),
  );

  if (productFoundResponses.some((r) => !r.success)) {
    return { success: false, message: "Product not found" };
  }

  const stockChecker = stockCheckerCreator(
    productFoundResponses.map(
      (r) => (r as successResponse<SingleProduct>).data,
    ),
  );

  if (stockTransfers.some((st) => !stockChecker(st))) {
    return { success: false, message: "Insufficient stock" };
  }

  return { success: false, message: "not implemented" };
};

const stockCheckerCreator = (products: SingleProduct[]) => {
  const productsMapper: Record<string, SingleProduct> = products.reduce(
    (acc: Record<string, SingleProduct>, product) => {
      acc[product.id!] = product;
      return acc;
    },
    {},
  );

  return (stockTransfer: OrderStockTransfer): boolean => {
    const product = productsMapper[stockTransfer.fromProductId];
    return product.stock >= stockTransfer.value;
  };
};
