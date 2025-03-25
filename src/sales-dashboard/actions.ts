"use server";

import {response} from "@/lib/types";
import {ProductToSales, Sales} from "@/sales-dashboard/type";
import {findProductToSales, findSales, findSalesBar} from "@/sales-dashboard/db_repository";
import {errorResponse} from "@/lib/utils";
import {log} from "@/lib/log";
import {getSession} from "@/lib/auth";
import {SearchParams} from "@/document/types";

export const calculateSalesMonthly= async (startOfMonth: Date, endOfMonth: Date): Promise<response<Sales>> => {

  const session = await getSession();
  const salesResponse = await findSalesBar(session.user?.companyId!, startOfMonth, endOfMonth)

  if (!salesResponse.success) {
    log.error("sales_not_found",{salesResponse, startOfMonth, endOfMonth})
    return errorResponse("Sales not found")
  }

  return {success: true, data: {finalAmount: salesResponse.data.finalAmount}}
}


export const findProductToSalesAction = async (startDate: Date, endDate: Date): Promise<response<ProductToSales[]>> => {
  return findProductToSales(startDate!,endDate!)
}