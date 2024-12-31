import {response} from "@/lib/types";
import prisma from "@/lib/prisma";
import {Sales} from "@/sales-dashboard/type";
import {plus} from "@/lib/utils";

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