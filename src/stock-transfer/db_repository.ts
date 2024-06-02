import {
  OrderStockTransfer,
  ProductStockTransfer,
  StockTransfer,
  StockTransferType,
} from "@/stock-transfer/types";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

const stockTransferTypeToPrismaMapper = {
  [OrderStockTransfer]: $Enums.StockTransferType.ORDER,
  [ProductStockTransfer]: $Enums.StockTransferType.PRODUCT,
};

const prismaToStockTransferTypeMapper: Record<
  keyof typeof $Enums.StockTransferType,
  StockTransferType
> = {
  [$Enums.StockTransferType.ORDER]: OrderStockTransfer,
  [$Enums.StockTransferType.PRODUCT]: ProductStockTransfer,
};

const buildPrismaData = (stockTransfer: StockTransfer) => {
  if (stockTransfer.type === OrderStockTransfer) {
    return {
      orderItemId: stockTransfer.orderItemId,
    };
  } else {
    return {
      fromProductId: stockTransfer.fromProductId,
      toProductId: stockTransfer.toProductId,
    };
  }
};

const create = async (
  stockTransfer: StockTransfer,
): Promise<response<StockTransfer>> => {
  try {
    const storedProduct = await prisma.stockTransfer.create({
      data: {
        ...stockTransfer,
        type: stockTransferTypeToPrismaMapper[stockTransfer.type],
        data: buildPrismaData(stockTransfer),
      },
    });
    return {
      success: true,
      data: {
        ...storedProduct,
        value: storedProduct.value.toNumber(),
        type: OrderStockTransfer,
        orderItemId: (storedProduct.data as Record<string, string>)[
          "orderItemId"
        ],
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
