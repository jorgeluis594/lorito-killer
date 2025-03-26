"use server";

import {response} from "@/lib/types";
import {ProductToSales, Sales, SalesDaily, SalesWeekly} from "@/sales-dashboard/type";
import {
  findProductToSales, findSalesDaily,
  findSalesMonthly,
  findSalesWeekly
} from "@/sales-dashboard/db_repository";
import {errorResponse} from "@/lib/utils";
import {log} from "@/lib/log";
import {getSession} from "@/lib/auth";

export const calculateSalesDaily= async (startOfDay: Date, endOfDay: Date): Promise<response<SalesDaily>> => {

  const session = await getSession();
  const salesResponse = await findSalesDaily(session.user?.companyId!, startOfDay, endOfDay)

  if (!salesResponse.success) {
    log.error("sales_not_found",{salesResponse, startOfDay, endOfDay})
    return errorResponse("Sales not found")
  }

  return {success: true, data: {salesByHour: salesResponse.data.salesByHour,}}
}

export const calculateSalesWeekly= async (startDate: Date, endDate: Date): Promise<response<SalesWeekly>> => {

  const session = await getSession();
  const salesResponse = await findSalesWeekly(session.user?.companyId!, startDate, endDate)

  if (!salesResponse.success) {
    log.error("sales_not_found",{salesResponse, startDate, endDate})
    return errorResponse("Sales not found")
  }

  return {success: true, data: {salesByDay: salesResponse.data.salesByDay,}}
}

export const calculateSalesMonthly= async (startOfMonth: Date, endOfMonth: Date): Promise<response<Sales>> => {

  const session = await getSession();
  const salesResponse = await findSalesMonthly(session.user?.companyId!, startOfMonth, endOfMonth)

  if (!salesResponse.success) {
    log.error("sales_not_found",{salesResponse, startOfMonth, endOfMonth})
    return errorResponse("Sales not found")
  }

  return {success: true, data: {finalAmount: salesResponse.data.finalAmount}}
}

export const findProductToSalesAction = async (startDate: Date, endDate: Date): Promise<response<ProductToSales[]>> => {
  return findProductToSales(startDate!,endDate!)
}