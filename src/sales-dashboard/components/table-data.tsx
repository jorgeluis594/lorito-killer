"use client";

import {Card, CardContent, CardHeader, CardTitle} from "@/shared/components/ui/card";
import {useEffect, useState} from "react";
import {Bar, BarChart, ResponsiveContainer, XAxis, YAxis} from "recharts";
import {calculateSalesDaily, calculateSalesMonthly, calculateSalesWeekly} from "@/sales-dashboard/actions";
import {endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek} from "date-fns";

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
        const hours = Array.from({ length: 24 }, (_, i) => i);

        const startOfDaily = startOfDay(new Date());
        const endOfDaily = endOfDay(new Date());

        const dataSales = await Promise.all(hours.map(async (hour) => {
          const startOfHour = new Date(startOfDaily);
          startOfHour.setHours(hour, 0, 0, 0);

          const endOfHour = new Date(endOfDaily);
          endOfHour.setHours(hour, 59, 59, 999);

          return calculateSalesDaily(startOfHour, endOfHour);
        }));

        const result = dataSales.map((responseSale, index) => {
          if (!responseSale.success) {
            return {
              name: `${index}:00`,
              total: 0,
            };
          }

          return {
            name: `${index}:00`,
            total: responseSale.data.salesByHour[index],
          };
        });

        setSales(result);
      }

      if(period === "weekly") {
        const days = Array.from({ length: 7 }, (_, i) => i);

        const startOfWeekDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        const endOfWeekDate = endOfWeek(new Date(), { weekStartsOn: 1 });

        const dataSales = await Promise.all(days.map(() => calculateSalesWeekly(startOfWeekDate, endOfWeekDate)));

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
        const months = Array.from({ length: 12 }, (_, i) => i);

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