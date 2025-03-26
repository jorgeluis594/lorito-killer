import {ScrollArea} from "@/shared/components/ui/scroll-area";
import React from "react";
import {response} from "@/lib/types";
import {SearchParams} from "@/document/types";
import {getSession} from "@/lib/auth";
import {errorResponse} from "@/lib/utils";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import {
  findExpenses,
  findOrdersUtility,
  findTotalSales
} from "@/sales-dashboard/db_repository";
import DashboardData from "@/sales-dashboard/components/dashboard-data";

type ParamsProps = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

const getSearchParams = async ({
  searchParams,
}: ParamsProps): Promise<response<SearchParams>> => {
  const session = await getSession();
  if (!session.user)
    return errorResponse("Usuario no autenticado", "AuthError");

  const params: SearchParams = {
    companyId: session.user.companyId,
  };

  if (searchParams.start) {
    params.startDate = new Date(searchParams.start as string);
  }else {
    params.startDate = new Date();
    params.startDate.setHours(0, 0, 0, 0);
  }

  if (searchParams.end) {
    params.endDate = new Date(searchParams.end as string);
  } else {
    params.endDate = new Date();
    params.endDate.setHours(23, 59, 59, 999);
  }

  return {success: true, data: params};
};

async function DashboardDataWithSuspense({searchParams}: ParamsProps) {
  const dataQuery = await getSearchParams({searchParams});
  if (!dataQuery.success) {
    return <SignOutRedirection/>;
  }

  const [expensesResponse, totalSalesResponse, utilityResponse] = await Promise.all([
    findExpenses(dataQuery.data),
    findTotalSales(dataQuery.data),
    findOrdersUtility(dataQuery.data),
  ]);

  if (!expensesResponse.success || !totalSalesResponse.success || !utilityResponse.success) {
    return <p>Error cargando datos, comuniquese con soporte</p>;
  }

  return (
    <DashboardData
      sales={totalSalesResponse.data.finalAmount}
      expenses={expensesResponse.data.expenseTotal}
      utility={utilityResponse.data.utility}
      startDate={dataQuery.data.startDate!}
      endDate={dataQuery.data.endDate!}
    />
  );
}

export default function page({searchParams}: ParamsProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-6 md:p-10 pt-8">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-4xl font-bold tracking-tight text-gray-800">Datos</h2>
        </div>
        <DashboardDataWithSuspense searchParams={searchParams} />
      </div>
    </ScrollArea>
  );
}

