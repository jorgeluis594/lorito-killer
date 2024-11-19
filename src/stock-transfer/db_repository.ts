import {
  OrderStockTransfer,
  ProductMovementStockTransferName,
  StockTransfer,
  StockTransferType,
  OrderStockTransferName,
  TypeAdjustmentStockTransfer,
  AdjustmentStockTransfer,
  ProductMovementStockTransfer,
  Status,
} from "@/stock-transfer/types";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import {
  $Enums,
  Prisma,
  StockTransfer as PrismaStockTransfer,
} from "@prisma/client";
import StockTransferCreateArgs = Prisma.StockTransferCreateArgs;
import { log } from "@/lib/log";

const stockTransferTypeToPrismaMapper = {
  [OrderStockTransferName]: $Enums.StockTransferType.ORDER,
  [ProductMovementStockTransferName]: $Enums.StockTransferType.PRODUCT_MOVEMENT,
  [AdjustmentStockTransfer]: $Enums.StockTransferType.ADJUSTMENT,
};

const PRISMA_TO_STATUS_MAPPER: Record<$Enums.StockTransferStatus, Status> = {
  [$Enums.StockTransferStatus.PENDING]: "pending",
  [$Enums.StockTransferStatus.EXECUTED]: "executed",
  [$Enums.StockTransferStatus.ROLLED_BACK]: "rolled_back",
  [$Enums.StockTransferStatus.CANCELLED]: "cancelled",
} as const;

const STATUS_TO_PRISMA_MAPPER: Record<Status, $Enums.StockTransferStatus> = {
  pending: $Enums.StockTransferStatus.PENDING,
  executed: $Enums.StockTransferStatus.EXECUTED,
  rolled_back: $Enums.StockTransferStatus.ROLLED_BACK,
  cancelled: $Enums.StockTransferStatus.CANCELLED,
} as const;

const prismaToStockTransferTypeMapper: Record<
  keyof typeof $Enums.StockTransferType,
  StockTransferType
> = {
  [$Enums.StockTransferType.ORDER]: OrderStockTransferName,
  [$Enums.StockTransferType.PRODUCT_MOVEMENT]: ProductMovementStockTransferName,
  [$Enums.StockTransferType.ADJUSTMENT]: AdjustmentStockTransfer,
};

const orderStockTransferPrismaDataBuilder = (
  stockTransfer: OrderStockTransfer,
): StockTransferCreateArgs => {
  const { orderItemId, productName, ...stockTransferData } = stockTransfer;
  return {
    data: {
      ...stockTransferData,
      status: STATUS_TO_PRISMA_MAPPER[stockTransferData.status],
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
      status: STATUS_TO_PRISMA_MAPPER[stockTransferData.status],
      data: { batchId },
      type: stockTransferTypeToPrismaMapper[stockTransferData.type],
    },
  };
};

const productMovementStockTransferPrismaDataBuilder = (
  stockTransfer: ProductMovementStockTransfer,
): StockTransferCreateArgs => {
  const { fromProductId, toProductId, productName, ...stockTransferData } =
    stockTransfer;
  return {
    data: {
      ...stockTransferData,
      status: STATUS_TO_PRISMA_MAPPER[stockTransferData.status],
      data: { fromProductId, toProductId },
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
  } else if (stockTransfer.type === ProductMovementStockTransferName) {
    return productMovementStockTransferPrismaDataBuilder(stockTransfer);
  }

  throw new Error("Builder not implemented");
};

const buildStockTransferFromPrisma = (
  prismaStockTransfer: PrismaStockTransfer,
  productName: string,
): StockTransfer => {
  let stockTransfer: StockTransfer;

  if (prismaStockTransfer.type === $Enums.StockTransferType.ORDER) {
    stockTransfer = {
      ...prismaStockTransfer,
      value: prismaStockTransfer.value.toNumber(),
      status: PRISMA_TO_STATUS_MAPPER[prismaStockTransfer.status],
      type: OrderStockTransferName,
      productName: productName,
      orderItemId: (prismaStockTransfer.data as Record<string, string>)[
        "orderItemId"
      ],
    };
  } else if (prismaStockTransfer.type === $Enums.StockTransferType.ADJUSTMENT) {
    stockTransfer = {
      ...prismaStockTransfer,
      status: PRISMA_TO_STATUS_MAPPER[prismaStockTransfer.status],
      value: prismaStockTransfer.value.toNumber(),
      type: AdjustmentStockTransfer,
      productName: productName,
      batchId: (prismaStockTransfer.data as Record<string, string>)["batchId"],
    };
  } else if (
    prismaStockTransfer.type === $Enums.StockTransferType.PRODUCT_MOVEMENT
  ) {
    stockTransfer = {
      ...prismaStockTransfer,
      status: PRISMA_TO_STATUS_MAPPER[prismaStockTransfer.status],
      value: prismaStockTransfer.value.toNumber(),
      type: ProductMovementStockTransferName,
      productName: productName,
      fromProductId: (prismaStockTransfer.data as Record<string, string>)[
        "fromProductId"
      ],
      toProductId: (prismaStockTransfer.data as Record<string, string>)[
        "toProductId"
      ],
    };
  } else {
    throw new Error(`Prisma type not implemented: ${prismaStockTransfer.type}`);
  }

  return stockTransfer;
};

export const update = async (
  stockTransfer: StockTransfer,
): Promise<response<StockTransfer>> => {
  const { data } = buildStockTransferData(stockTransfer);

  try {
    const updatedStockTransfer = await prisma().stockTransfer.update({
      where: { id: stockTransfer.id },
      data,
    });

    return {
      success: true,
      data: buildStockTransferFromPrisma(
        updatedStockTransfer,
        stockTransfer.productName,
      ),
    };
  } catch (error: any) {
    log.error("update_stock_transfer_failed", {
      stockTransfer,
      data,
      message: error.message,
    });
    return { success: false, message: error.message };
  }
};

export const create = async (
  stockTransfer: StockTransfer,
): Promise<response<StockTransfer>> => {
  try {
    const storedStockTransfer = await prisma().stockTransfer.create(
      buildStockTransferData(stockTransfer),
    );

    return {
      success: true,
      data: buildStockTransferFromPrisma(
        storedStockTransfer,
        stockTransfer.productName,
      ),
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
    await prisma().product.update({
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

export const rollbackStock = async (
  stockTransfer: StockTransfer,
): Promise<response<undefined>> => {
  try {
    await prisma().product.update({
      where: { id: stockTransfer.productId },
      data: {
        stock: {
          decrement: stockTransfer.value,
        },
      },
    });

    return { success: true, data: undefined };
  } catch (error: any) {
    log.error("rollback_stock_transfer_failed", {
      stockTransfer,
      message: error.message,
    });
    return { success: false, message: "Error rolled back stock transfer" };
  }
};

export const getMany = async ({
  companyId,
  page,
  pageLimit,
  orderId,
}: {
  companyId: string;
  page?: number;
  pageLimit?: number;
  orderId?: string;
}): Promise<response<StockTransfer[]>> => {
  try {
    let orderItemsIds: string[] = [];
    if (orderId) {
      orderItemsIds = (
        await prisma().orderItem.findMany({
          where: { orderId },
          select: { id: true },
        })
      ).map((orderItem) => orderItem.id);
    }

    const extraConditions = orderItemsIds.map((oi) => ({
      data: { path: ["orderItemId"], equals: oi },
    }));

    const result = await prisma().stockTransfer.findMany({
      where: {
        companyId,
        OR: orderItemsIds.length ? extraConditions : undefined,
      },
      skip: page && pageLimit ? (page - 1) * pageLimit : undefined,
      orderBy: { createdAt: "desc" },
      take: pageLimit,
      include: { product: true, user: true },
    });

    return {
      success: true,
      data: result.map((prismaStockTransfer) => {
        const { product, ...stockTransferData } = prismaStockTransfer;
        const userData = {
          userId: prismaStockTransfer.userId,
          userName: prismaStockTransfer.user?.name || undefined,
        };

        switch (stockTransferData.type) {
          case $Enums.StockTransferType.ORDER:
            return {
              ...stockTransferData,
              ...userData,
              status: PRISMA_TO_STATUS_MAPPER[stockTransferData.status],
              value: stockTransferData.value.toNumber(),
              type: OrderStockTransferName,
              productName: product.name,
              orderItemId: (stockTransferData.data as Record<string, string>)[
                "orderItemId"
              ],
            };
          case $Enums.StockTransferType.ADJUSTMENT:
            return {
              ...stockTransferData,
              ...userData,
              status: PRISMA_TO_STATUS_MAPPER[stockTransferData.status],
              value: stockTransferData.value.toNumber(),
              type: AdjustmentStockTransfer,
              productName: product.name,
              batchId: (stockTransferData.data as Record<string, string>)[
                "batchId"
              ],
            };
          case $Enums.StockTransferType.PRODUCT_MOVEMENT:
            return {
              ...stockTransferData,
              ...userData,
              status: PRISMA_TO_STATUS_MAPPER[stockTransferData.status],
              value: stockTransferData.value.toNumber(),
              type: ProductMovementStockTransferName,
              productName: product.name,
              fromProductId: (stockTransferData.data as Record<string, string>)[
                "fromProductId"
              ],
              toProductId: (stockTransferData.data as Record<string, string>)[
                "toProductId"
              ],
            };
          default:
            throw new Error(
              `Prisma type not implemented: ${stockTransferData.type}`,
            );
        }
      }),
    };
  } catch (error: any) {
    return { success: false, message: "Error" };
  }
};

export const total = async (companyId: string): Promise<number> => {
  return prisma().stockTransfer.count({ where: { companyId } });
};
