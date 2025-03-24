import {ScrollArea} from "@/shared/components/ui/scroll-area";
import TableData from "@/sales-dashboard/components/table-data";
import BestSeller from "@/sales-dashboard/components/best-selling-product";
import React from "react";
import DateFilterSelect from "@/sales-dashboard/components/date-filter-select";
import {SalesExpenseProfitCard} from "@/sales-dashboard/components/sales-expense-profit-card";
import {response} from "@/lib/types";
import {SearchParams} from "@/document/types";
import {getSession} from "@/lib/auth";
import {errorResponse} from "@/lib/utils";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import {findExpenses, findOrdersUtility, findSales} from "@/sales-dashboard/db_repository";

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
  }

  if (searchParams.end) {
    params.endDate = new Date(searchParams.end as string);
  }

  return {success: true, data: params};
};

async function SalesExpenseProfitCardWithSuspense({searchParams}: ParamsProps) {
  const dateQuery = await getSearchParams({searchParams});
  if (!dateQuery.success) {
    return <SignOutRedirection/>;
  }

  const [expensesResponse, totalSalesResponse, utilityResponse] = await Promise.all([
    findExpenses(dateQuery.data),
    findSales(dateQuery.data),
    findOrdersUtility(dateQuery.data)
  ]);

  if (!expensesResponse.success || !totalSalesResponse.success || !utilityResponse.success) {
    return <p>Error cargando datos, comuniquese con soporte</p>;
  }

  return (
    <SalesExpenseProfitCard sales={totalSalesResponse.data.finalAmount} expenses={expensesResponse.data.expenseTotal} utility={utilityResponse.data.utility} />
  );
}

export default function page({searchParams}: ParamsProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-6 md:p-10 pt-8">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-4xl font-bold tracking-tight text-gray-800">Datos</h2>
        </div>
        <DateFilterSelect/>
        <SalesExpenseProfitCardWithSuspense searchParams={searchParams}/>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
          <TableData/>
          <BestSeller/>
        </div>
      </div>
    </ScrollArea>
  );
}

