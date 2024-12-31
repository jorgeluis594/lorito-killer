"use server";

import {response} from "@/lib/types";
import {Sales} from "@/sales-dashboard/type";
import {findSales} from "@/sales-dashboard/db_repository";
import {errorResponse} from "@/lib/utils";
import {log} from "@/lib/log";
import {getSession} from "@/lib/auth";

export const calculateSalesMonthly= async (startOfMonth: Date, endOfMonth: Date): Promise<response<Sales>> => {

  const session = await getSession();
  console.log(session.user.companyId)
  const salesResponse = await findSales(session.user.companyId, startOfMonth, endOfMonth)

  if (!salesResponse.success) {
    log.error("sales_not_found",{salesResponse, startOfMonth, endOfMonth})
    return errorResponse("Sales not found")
  }

  return {success: true, data: {finalAmount: salesResponse.data.finalAmount}}
}