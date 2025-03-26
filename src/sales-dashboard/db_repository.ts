import {response} from "@/lib/types";
import prisma from "@/lib/prisma";
import {ExpenseAmount, ProductToSales, Sales, SalesWeekly} from "@/sales-dashboard/type";
import { plus} from "@/lib/utils";
import {SearchParams} from "@/document/types";
import {GrossProfit} from "@/cash-shift/types";
import {log} from "@/lib/log";

const findCashShift = async (
  companyId: string,
  startDate: Date,
  endDate: Date
) => {
   return prisma().cashShift.findMany({
     where: {companyId: companyId, openedAt: { gte: startDate,lte: endDate}},
      include: {
       orders: true,
       expenses: true,
    }
   })
}

export const findSalesDaily = async (
  companyId: string,
  startOfDay: Date,
  endOfDay: Date,
): Promise<response<SalesWeekly>> => {
  const salesFound = await findCashShift(companyId, startOfDay!, endOfDay!);

  console.log(salesFound)

  return {success:false, message:"a"}
}

export const findSalesWeekly = async (
  companyId: string,
  startDate: Date,
  endDate: Date,
): Promise<response<SalesWeekly>> => {
  const salesFound = await findCashShift(companyId, startDate!, endDate!);

  const salesByDay = Array(7).fill(0);

  salesFound.forEach((c) => {
    const date = new Date(c.createdAt);
    const dayOfWeek = date.getDay()-1;
    log.info("date",{date,dayOfWeek});

    const totalAmount = c.orders.reduce((sum, order) => {
      return plus(sum)(+order.netTotal || 0);
    }, 0);

    salesByDay[dayOfWeek] += totalAmount;
  });

  return {success:true, data: { salesByDay }}
}


export const findSalesMonthly = async (
  companyId: string,
  startDate: Date,
  endDate: Date,
): Promise<response<Sales>> => {
  const salesFound = await findCashShift(companyId, startDate!, endDate!);

  const salesMapped = salesFound.map((c) => ({
    totalOrdersAmount: c.orders.reduce((sum, order) => {
      return plus(sum)(+order.netTotal || 0);
    }, 0),
  }));

  const totalSales = salesMapped.reduce((sum, sale) => {
    return plus(sum)(sale.totalOrdersAmount || 0);
  }, 0);

  return {success:true, data: {finalAmount: totalSales}}
}

export const findTotalSales = async ({
  companyId,
  startDate,
  endDate
}: SearchParams): Promise<response<Sales>> => {
  const salesFound = await findCashShift(companyId, startDate!, endDate!);

  const salesMapped = salesFound.map((c) => ({
    totalOrdersAmount: c.orders.reduce((sum, order) => {
      return plus(sum)(+order.netTotal || 0);
    }, 0),
  }));

  const totalSales = salesMapped.reduce((sum, sale) => {
    return plus(sum)(sale.totalOrdersAmount || 0);
  }, 0);

  return {success:true, data: {finalAmount: totalSales}}
}

export const findProductToSales = async (
  startDate:Date,
  endDate: Date
): Promise<response<ProductToSales[]>> => {

  const orderItems = await prisma().orderItem.groupBy({
    where: {createdAt: { gte: startDate,lte: endDate}},
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

export const findOrdersUtility = async ({
  companyId,
  startDate,
  endDate,
}: SearchParams): Promise<response<GrossProfit>> => {
  const ordersResponse = await prisma().order.findMany({
    where: {companyId: companyId, createdAt: {gte: startDate, lte: endDate}},
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    }
  });

  const ordersMap = ordersResponse.map((order) => {
    const isCancelled = order.status === "CANCELLED";

    const orderTotal = order.orderItems.reduce((total, o) => {
      const purchaseTotal = +o.product.purchasePrice! * +o.quantity || 0;
      const totalDifference = +o.total - purchaseTotal || 0;

      total.totalPrice += purchaseTotal;
      total.totalDifference += totalDifference;

      return total;
    }, {
      totalPrice: 0,
      totalDifference: 0
    });

    if (isCancelled) {
      orderTotal.totalPrice -= orderTotal.totalPrice;
      orderTotal.totalDifference -= orderTotal.totalDifference;
    }

    return {
      utility: orderTotal.totalDifference,
    };

  })

  const totalUtility = ordersMap.flat(2).reduce((sum, order) => sum + order.utility, 0);

  return {
    success: true,
    data: {utility: totalUtility}
  }
}