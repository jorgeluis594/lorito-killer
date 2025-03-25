"use client";

import {useState} from "react";
import DateRangePicker from "@/shared/components/ui/date-range-picker";
import useUpdateQueryString from "@/lib/use-update-query-string";
import {addDays, endOfDay, startOfDay, startOfWeek, subDays} from "date-fns";
import {useSearchParams} from "next/navigation";
import {fromDate} from "@internationalized/date";


export default function DateFilterDashboard() {
  const updateRoute = useUpdateQueryString();
  const searchParams = useSearchParams();
  const from = searchParams.get("start");
  const to = searchParams.get("end");

  const [date, setDate] = useState<{ from: Date; to: Date } | undefined>({
    from: from ? new Date(from) : subDays(new Date(), 20),
    to: to ? new Date(to) : new Date(),
  });

  const onDateChange = (date: { from: Date; to: Date }) => {
    setDate(date);
    updateRoute({
      start: startOfDay(date.from).toISOString(),
      end: endOfDay(date.to).toISOString(),
    });
  };

  return (
    <div>
      <DateRangePicker
        placeholder="Rango de fechas a filtrar"
        value={date}
        onValueChange={onDateChange}
      />
    </div>
  );
}
