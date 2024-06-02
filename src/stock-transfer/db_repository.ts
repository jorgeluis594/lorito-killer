import {
  OrderStockTransfer,
  ProductStockTransfer,
  StockTransfer,
  StockTransferType,
  OrderStockTransferName,
} from "@/stock-transfer/types";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums, Prisma } from "@prisma/client";
import StockTransferCreateArgs = Prisma.StockTransferCreateArgs;

const stockTransferTypeToPrismaMapper = {
  [OrderStockTransferName]: $Enums.StockTransferType.ORDER,
  [ProductStockTransfer]: $Enums.StockTransferType.PRODUCT,
};

const prismaToStockTransferTypeMapper: Record<
  keyof typeof $Enums.StockTransferType,
  StockTransferType
> = {
  [$Enums.StockTransferType.ORDER]: OrderStockTransferName,
  [$Enums.StockTransferType.PRODUCT]: ProductStockTransfer,
};

const orderStockTransferPrismaDataBuilder = (
  stockTransfer: OrderStockTransfer,
): StockTransferCreateArgs => {
  const { orderItemId, ...stockTransferData } = stockTransfer;
  return {
    data: {
      ...stockTransferData,
      data: { orderItemId },
      type: stockTransferTypeToPrismaMapper[stockTransfer.type],
    },
  };
};

export const create = async (
  stockTransfer: StockTransfer,
): Promise<response<StockTransfer>> => {
  try {
    const { ...stockTransferData } = stockTransfer;

    if (stockTransfer.type !== OrderStockTransferName) {
      throw new Error("Not implemented");
    }

    const storedStockTransfer = await prisma.stockTransfer.create(
      orderStockTransferPrismaDataBuilder(stockTransfer),
    );

    return {
      success: true,
      data: {
        ...storedStockTransfer,
        value: storedStockTransfer.value.toNumber(),
        type: OrderStockTransferName,
        orderItemId: (storedStockTransfer.data as Record<string, string>)[
          "orderItemId"
        ],
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

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
