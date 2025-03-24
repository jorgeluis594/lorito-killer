import {response} from "@/lib/types";
import prisma from "@/lib/prisma";
import {ExpenseAmount, ProductToSales, Sales} from "@/sales-dashboard/type";
import {errorResponse, plus} from "@/lib/utils";
import {log} from "@/lib/log";
import {OrderItem} from "@/order/types";
import {SearchParams} from "@/document/types";

const findCashShift = async (
  companyId: string,
  startDate: Date,
  endDate: Date
) => {
   return prisma().cashShift.findMany({
     where: {companyId: companyId, createdAt: { gte: startDate,lte: endDate}},
      include: {
       expenses: true,
    }
   })
}

export const findSales = async (companyId: string, startDate: Date, endDate: Date): Promise<response<Sales>> => {
  const salesFound = await findCashShift(companyId, startDate, endDate);

  const salesMapped = salesFound.map((c) => ({
    finalAmount: c.finalAmount?.toNumber() || null,
  }));

  const totalSales = salesMapped.reduce((sum, sale) => {
    return plus(sum)(sale.finalAmount || 0);
  }, 0);

  return {success:true, data: {finalAmount: totalSales}}
}

export const findProductToSales = async (): Promise<response<ProductToSales[]>> => {

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
    include: {
      photos: true,
    }
  });

  const productData = products.map(product => ({
    productId: product.id,
    name: product.name,
    price: product.price,
    photos: product.photos,
  }));

  const productTotals = orderItems.map(item => {
    const product = productData.find(product => product.productId === item.productId);
    const quantity = item._sum.quantity || 0
    const price = product?.price || 0
    const totalPrice = +price * +quantity;
    return {
      productId: item.productId,
      productName: product?.name || "",
      productPrice: +price,
      quantity: +quantity || 0,
      photos: product?.photos || [],
      total: totalPrice,
    };
  });

  return {success: true, data: productTotals};
}

export const findExpenses = async ({
  companyId,
  startDate,
  endDate,
}: SearchParams): Promise<response<ExpenseAmount>> =>{

  const salesFound = await findCashShift(companyId, startDate!, endDate!);

  const salesMappedToExpenses = salesFound.map((c) => ({
    amountExpense: c.expenses.map((e) => e.amount)
  }));

  const totalExpenses = salesMappedToExpenses.reduce((sum, expense) => {
    return plus(sum)(+expense.amountExpense || 0);
  }, 0);

  return {success:true, data: {expenseTotal: totalExpenses}}
}