"use client";

import {Bar, BarChart, ResponsiveContainer, XAxis, YAxis} from "recharts";
import {calculateSalesMonthly} from "@/sales-dashboard/use-case/calculate-sales-monthly";
import {useEffect, useState} from "react";
import {endOfMonth, startOfMonth} from "date-fns";

const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export function Overview() {

  const [sales, setSales] = useState<Array<{ name: string, total: number }>>([]);

  useEffect(() => {
    const fetchSales = async () => {

      const months = [0,1,2,3,4,5,6,7,8,9,10,11]

      const dataSales = await Promise.all(months.map(async (month) => {
        const year = 2024;

        const startOfMonthDate = startOfMonth(new Date(year, month))
        const endOfMonthDate = endOfMonth(new Date(year, month))
        return calculateSalesMonthly(startOfMonthDate, endOfMonthDate);
      }))

      const result = dataSales.map((responseSale, index) => {
        if(!responseSale.success){
          return {
            name: monthNames[index],
            total: 0,
          }
        }

        return {
          name: monthNames[index],
          total: responseSale.data.finalAmount,
        }
      })

      setSales(result)
    };
    fetchSales();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={sales}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `S/.${value}`}
        />
        <Bar dataKey="total" fill="#adfa1d" radius={[4, 4, 0, 0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}
