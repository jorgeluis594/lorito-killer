import { OrderStockTransfer, StockUpdate } from "@/stock-transfer/types";
import { Order, OrderItem } from "@/order/types";
import {
  PackageProduct,
  PackageProductType,
  Product,
  SingleProduct,
} from "@/product/types";
import { response, successResponse } from "@/lib/types";

type FindProduct = (productId: string) => Promise<response<Product>>;

export const generateOrderStocksTransfers = async (
  order: Order,
  findProduct: FindProduct,
): Promise<response<OrderStockTransfer[]>> => {
  const stockTransfersResponse = await Promise.all(
    order.orderItems.map((oi) =>
      generateOrderItemStockTransfer(oi, findProduct),
    ),
  );

  if (stockTransfersResponse.some((r) => !r.success)) {
    return { success: false, message: "Cannot create orderStockTransfer" };
  }

  const stockTransfers = stockTransfersResponse
    .map(
      (orderItemStockTransferResponse) =>
        (
          orderItemStockTransferResponse as successResponse<
            OrderStockTransfer[]
          >
        ).data,
    )
    .flat();

  return {
    success: true,
    data: stockTransfers,
  };
};

const generateOrderItemStockTransfer = async (
  orderItem: OrderItem,
  findProduct: FindProduct,
): Promise<response<OrderStockTransfer[]>> => {
  const productFoundResponse = await findProduct(orderItem.productId);
  if (!productFoundResponse.success) {
    return productFoundResponse;
  }

  const product = productFoundResponse.data;
  let stockTransfers: OrderStockTransfer[];

  if (product.type == PackageProductType) {
    stockTransfers = generatePackageProductStockTransfers(orderItem, product);
  } else {
    stockTransfers = generateSingleProductStockTransfers(orderItem, product);
  }

  return { success: true, data: stockTransfers };
};

const generatePackageProductStockTransfers = (
  orderItem: OrderItem,
  product: PackageProduct,
): OrderStockTransfer[] => {
  return product.productItems.map((productItem) => ({
    id: crypto.randomUUID(),
    orderItemId: orderItem.id!,
    value: -1 * (orderItem.quantity * productItem.quantity),
    productId: productItem.id!,
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
      productId: product.id!,
      type: OrderStockTransfer,
    },
  ];
};

export const validateStockTransfers = async (
  stockTransfers: OrderStockTransfer[],
  findProduct: FindProduct,
): Promise<response<undefined>> => {
  const productFoundResponses = await Promise.all(
    stockTransfers.map((st) => findProduct(st.productId)),
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
    const product = productsMapper[stockTransfer.productId];
    return product.stock >= stockTransfer.value;
  };
};
