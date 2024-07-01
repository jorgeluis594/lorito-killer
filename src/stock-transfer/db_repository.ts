import {
  OrderStockTransfer,
  ProductStockTransfer,
  StockTransfer,
  StockTransferType,
  OrderStockTransferName,
  TypeAdjustmentStockTransfer,
  AdjustmentStockTransfer,
} from "@/stock-transfer/types";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums, Prisma } from "@prisma/client";
import StockTransferCreateArgs = Prisma.StockTransferCreateArgs;

const stockTransferTypeToPrismaMapper = {
  [OrderStockTransferName]: $Enums.StockTransferType.ORDER,
  [ProductStockTransfer]: $Enums.StockTransferType.PRODUCT,
  [AdjustmentStockTransfer]: $Enums.StockTransferType.ADJUSTMENT,
};

const prismaToStockTransferTypeMapper: Record<
  keyof typeof $Enums.StockTransferType,
  StockTransferType
> = {
  [$Enums.StockTransferType.ORDER]: OrderStockTransferName,
  [$Enums.StockTransferType.PRODUCT]: ProductStockTransfer,
  [$Enums.StockTransferType.ADJUSTMENT]: AdjustmentStockTransfer,
};

const orderStockTransferPrismaDataBuilder = (
  stockTransfer: OrderStockTransfer,
): StockTransferCreateArgs => {
  const { orderItemId, productName, ...stockTransferData } = stockTransfer;
  return {
    data: {
      ...stockTransferData,
      data: { orderItemId },
      type: stockTransferTypeToPrismaMapper[stockTransfer.type],
    },
  };
};

const adjustmentStockTransferPrismaDataBuilder = (
  stockTransfer: TypeAdjustmentStockTransfer,
): StockTransferCreateArgs => {
  const { batchId, productName, ...stockTransferData } = stockTransfer;
  return {
    data: {
      ...stockTransferData,
      data: { batchId },
      type: stockTransferTypeToPrismaMapper[stockTransferData.type],
    },
  };
};

const buildStockTransferData = (
  stockTransfer: StockTransfer,
): StockTransferCreateArgs => {
  if (stockTransfer.type === OrderStockTransferName) {
    return orderStockTransferPrismaDataBuilder(stockTransfer);
  } else if (stockTransfer.type === AdjustmentStockTransfer) {
    return adjustmentStockTransferPrismaDataBuilder(stockTransfer);
  }

  throw new Error("Builder not implemented");
};

export const create = async (
  stockTransfer: StockTransfer,
): Promise<response<StockTransfer>> => {
  try {
    const storedStockTransfer = await prisma.stockTransfer.create(
      buildStockTransferData(stockTransfer),
    );
    let persistedStockTransfer: StockTransfer;

    if (storedStockTransfer.type === $Enums.StockTransferType.ORDER) {
      persistedStockTransfer = {
        ...storedStockTransfer,
        value: storedStockTransfer.value.toNumber(),
        type: OrderStockTransferName,
        productName: stockTransfer.productName,
        orderItemId: (storedStockTransfer.data as Record<string, string>)[
          "orderItemId"
        ],
      };
    } else if (
      storedStockTransfer.type === $Enums.StockTransferType.ADJUSTMENT
    ) {
      persistedStockTransfer = {
        ...storedStockTransfer,
        value: storedStockTransfer.value.toNumber(),
        type: AdjustmentStockTransfer,
        productName: stockTransfer.productName,
        batchId: (storedStockTransfer.data as Record<string, string>)[
          "batchId"
        ],
      };
    } else {
      throw new Error("Not implemented");
    }

    return {
      success: true,
      data: persistedStockTransfer,
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Updates the stock of a product in the database.
 *
 * This function takes a `StockTransfer` object as an argument, which contains the `productId` and the `value` to increment the stock by.
 * It uses the Prisma client to update the product's stock in the database.
 * If the operation is successful, it returns a response object with `success` set to `true` and `data` set to `undefined`.
 * If an error occurs during the operation, it returns a response object with `success` set to `false` and `message` set to the error message.
 *
 * @param {StockTransfer} stockTransfer - The stock transfer object containing the product ID and the value to increment the stock by.
 * @returns {Promise<response<undefined>>} - A promise that resolves to a response object.
 * @throws {Error} - Throws an error if the operation fails.
 */
export const updateStock = async (
  stockTransfer: StockTransfer,
): Promise<response<undefined>> => {
  try {
    await prisma.product.update({
      where: { id: stockTransfer.productId },
      data: {
        stock: {
          increment: stockTransfer.value,
        },
      },
    });

    return { success: true, data: undefined };
  } catch (error: any) {
    return { success: false, message: "Not implemented" };
  }
};

export const getMany = async (
  companyId: string,
  page: number,
  pageLimit: number,
): Promise<response<StockTransfer[]>> => {
  try {
    const result = await prisma.stockTransfer.findMany({
      where: { companyId },
      skip: (page - 1) * pageLimit,
      take: pageLimit,
      include: { product: true },
    });

    return {
      success: true,
      data: result.map((prismaStockTransfer) => ({
        ...prismaStockTransfer,
        value: prismaStockTransfer.value.toNumber(),
        type: "OrderStockTransfer",
        productName: prismaStockTransfer.product.name,
        orderItemId: (prismaStockTransfer.data as Record<string, string>)[
          "orderItemId"
        ],
      })),
    };
  } catch (error: any) {
    return { success: false, message: "Error" };
  }
};

export const total = async (companyId: string): Promise<number> => {
  return prisma.stockTransfer.count({ where: { companyId } });
};
