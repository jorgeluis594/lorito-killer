"use client";

import { Label } from "@/shared/components/ui/label";
import { useState } from "react";
import DateRangePicker from "@/shared/components/ui/date-range-picker";
import useUpdateQueryString from "@/lib/use-update-query-string";
import { endOfDay, startOfDay } from "date-fns";
import { useSearchParams } from "next/navigation";
import { reportDateRangeFromSearchParams } from "@/sale_report/search-params";

type DateFilterProps = {
  label?: string;
  description?: string;
};

export default function DateFilter({
  label = "Fecha de emisión",
  description = "Rango de fechas a filtrar",
}: DateFilterProps) {
  const updateRoute = useUpdateQueryString();
  const searchParams = useSearchParams();
  const from = searchParams.get("start");
  const to = searchParams.get("end");
  const defaultDateRange = reportDateRangeFromSearchParams({
    start: from ?? undefined,
    end: to ?? undefined,
  });

  const [date, setDate] = useState<{ from: Date; to: Date } | undefined>({
    from: defaultDateRange.startDate,
    to: defaultDateRange.endDate,
  });

  const onDateChange = (date: { from: Date; to: Date }) => {
    setDate(date);
    updateRoute({
      start: startOfDay(date.from).toISOString(),
      end: endOfDay(date.to).toISOString(),
    });
  };

  return (
    <section>
      <div className="mb-2">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <DateRangePicker
        placeholder="Rango de fechas a filtrar"
        value={date}
        onValueChange={onDateChange}
      />
    </section>
  );
}
