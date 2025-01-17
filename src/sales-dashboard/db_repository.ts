import {response} from "@/lib/types";
import prisma from "@/lib/prisma";
import {ProductToSales, Sales} from "@/sales-dashboard/type";
import {plus} from "@/lib/utils";
import {log} from "@/lib/log";
import {OrderItem} from "@/order/types";

export const findSales = async (companyId: string, startOfMonth: Date, endOfMonth: Date): Promise<response<Sales>> => {
  const salesFound = (
    await prisma().cashShift.findMany({where: {companyId: companyId, closedAt: { gte: startOfMonth,lte: endOfMonth}} })
  )
  const salesMapped = salesFound.map((c) => ({
    finalAmount: c.finalAmount?.toNumber() || null,
  }));

  const totalSales = salesMapped.reduce((sum, sale) => {
    return plus(sum)(sale.finalAmount || 0);
  }, 0);

  return {success:true, data: {finalAmount: totalSales}}
}

export const findProductToSales = async (): Promise<response<boolean>> => {

  const orderItems = await prisma().orderItem.groupBy({
    by: ['productId'],
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: 10,
  });

  const productIds = orderItems.map(item => item.productId);

  const products = await prisma().product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
  });

  const productData = products.map(product => ({
    productId: product.id,
    name: product.name,
    price: product.price,
  }));

  const productTotals = orderItems.map(item => {
    const product = productData.find(product => product.productId === item.productId);
    const quantity = item._sum.quantity || 0
    const price = product?.price || 0
    const totalPrice = +price * +quantity;
    return {
      name: product?.name,
      total: totalPrice,
    };
  });

  log.info("productInfo",{orderItems,productData, productTotals})

  return {success: false, message: "uwu"};
}