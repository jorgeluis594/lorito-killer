"use client";

import TableData from "@/sales-dashboard/components/table-data";
import BestSeller from "@/sales-dashboard/components/best-selling-product";
import React, {useState} from "react";
import {SalesExpenseProfitCard} from "@/sales-dashboard/components/sales-expense-profit-card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/shared/components/ui/select";
import DateFilterDashboard from "@/sales-dashboard/components/filter/date-filter";

interface DashboardData {
  sales: number;
  expenses: number;
  utility: number;
  startDate: Date;
  endDate: Date;
}

export default function DashboardData({sales, expenses, utility,startDate,endDate}:DashboardData) {
  const [period, setPeriod] = useState<string>("daily")

  const handleSelectChange = (value: string) => {
    setPeriod(value);
  };

  return (
    <>
      <div className="flex flex-row gap-4">
        <div>
          <Select onValueChange={handleSelectChange} defaultValue={period}>
            <SelectTrigger className="w-auto md:w-[180px]">
              <SelectValue placeholder="Seleccione periodo"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diario</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <DateFilterDashboard/>
        </div>
      </div>
      <SalesExpenseProfitCard sales={sales} expenses={expenses} utility={utility}/>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <TableData period={period} sales={sales}/>
        <BestSeller startDate={startDate} endDate={endDate}/>
      </div>
    </>
  );
}

