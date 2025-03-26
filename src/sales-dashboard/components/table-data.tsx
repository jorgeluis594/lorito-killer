"use client";

import {Card, CardContent, CardHeader, CardTitle} from "@/shared/components/ui/card";
import {useEffect, useState} from "react";
import {Bar, BarChart, ResponsiveContainer, XAxis, YAxis} from "recharts";
import {calculateSalesDaily, calculateSalesMonthly, calculateSalesWeekly} from "@/sales-dashboard/actions";
import {endOfMonth, endOfWeek, startOfMonth, startOfWeek} from "date-fns";

interface TableDataProps {
  period: string;
  sales: number;
}

const daysNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function TableData({period, sales}: TableDataProps) {
  const [salesM, setSales] = useState<Array<{ name: string, total: number }>>([]);

  useEffect(() => {
    const fetchSales = async () => {

      if(period === "daily"){
        const days = Array.from({ length: 7 }, (_, i) => i);

        const dataSales = await Promise.all(days.map(async (dayOffset) => {
          const date = new Date();
          date.setDate(date.getDate() - dayOffset);

          const startOfDay = new Date(date.setHours(0, 0, 0, 0));
          const endOfDay = new Date(date.setHours(23, 59, 59, 999));

          return calculateSalesDaily(startOfDay, endOfDay);
        }))
      }

      if(period === "weekly") {
        const days = [0, 1, 2, 3, 4, 5, 6]

        const dataSales = await Promise.all(days.map(async (day) => {

          const startOfMonthDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          const endOfMonthDate = endOfWeek(new Date(), { weekStartsOn: 1 });

          return calculateSalesWeekly(startOfMonthDate, endOfMonthDate);
        }))

        const result = dataSales.map((responseSale, index) => {
          if (!responseSale.success) {
            return {
              name: daysNames[index],
              total: 0,
            }
          }

          return {
            name: daysNames[index],
            total: responseSale.data.salesByDay[index],
          }
        })

        setSales(result)
      }

      if(period === "monthly"){
        const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

        const dataSales = await Promise.all(months.map(async (month) => {
          const year = new Date().getFullYear();

          const startOfMonthDate = startOfMonth(new Date(year, month))
          const endOfMonthDate = endOfMonth(new Date(year, month))

          return calculateSalesMonthly(startOfMonthDate, endOfMonthDate);
        }))

        const result = dataSales.map((responseSale, index) => {
          if (!responseSale.success) {
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
      }
    };
    fetchSales();
  }, [period]);

  return(
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Ventas</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={salesM} >
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
      </CardContent>
    </Card>
  )
}