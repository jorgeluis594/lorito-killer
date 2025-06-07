import {
  OrderStockTransfer,
  OrderStockTransferName,
} from "@/stock-transfer/types";
import { Order, OrderItem } from "@/order/types";
import {
  PackageProduct,
  PackageProductType,
  Product,
  SingleProduct,
} from "@/product/types";
import { response, successResponse } from "@/lib/types";
import { mul, plus } from "@/lib/utils";
import { log } from "@/lib/log";

type FindProduct = (productId: string) => Promise<response<Product>>;

export const generateOrderStocksTransfers = async (
  userId: string,
  order: Order,
  findProduct: FindProduct,
): Promise<response<OrderStockTransfer[]>> => {
  const stockTransfersResponse = await Promise.all(
    order.orderItems.map((oi) =>
      generateOrderItemStockTransfer(userId, oi, findProduct),
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
  userId: string,
  orderItem: OrderItem,
  findProduct: FindProduct,
): Promise<response<OrderStockTransfer[]>> => {
  const productFoundResponse = await findProduct(orderItem.productId);
  if (!productFoundResponse.success) {
    log.error("product_not_found", { orderItemId: orderItem.id, productId: orderItem.productId });
    return productFoundResponse;
  }

  const product = productFoundResponse.data;
  let stockTransfers: OrderStockTransfer[];

  if (product.type == PackageProductType) {
    stockTransfers = generatePackageProductStockTransfers(
      orderItem,
      userId,
      product,
    );
  } else {
    stockTransfers = generateSingleProductStockTransfers(
      orderItem,
      userId,
      product,
    );
  }

  return { success: true, data: stockTransfers };
};

const generatePackageProductStockTransfers = (
  orderItem: OrderItem,
  userId: string,
  product: PackageProduct,
): OrderStockTransfer[] => {
  return product.productItems.map((productItem) => ({
    id: crypto.randomUUID(),
    userId,
    status: "pending",
    orderItemId: orderItem.id!,
    companyId: product.companyId,
    productName: productItem.productName,
    value: mul(-1)(mul(orderItem.quantity)(productItem.quantity)),
    productId: productItem.productId,
    createdAt: new Date(),
    type: OrderStockTransferName,
  }));
};

const generateSingleProductStockTransfers = (
  orderItem: OrderItem,
  userId: string,
  product: SingleProduct,
): OrderStockTransfer[] => {
  return [
    {
      id: crypto.randomUUID(),
      userId,
      status: "pending",
      orderItemId: orderItem.id!,
      companyId: product.companyId,
      createdAt: new Date(),
      value: mul(-1)(orderItem.quantity),
      productId: product.id!,
      productName: product.name,
      type: OrderStockTransferName,
    },
  ];
};

export const validateStockTransfers = async (
  stockTransfers: OrderStockTransfer[],
  findProduct: FindProduct,
): Promise<response<boolean>> => {
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
    return { success: true, data: false };
  }

  return { success: true, data: true };
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

    return plus(product.stock)(stockTransfer.value) >= 0;
  };
};
