"use client";

import { Label } from "@/shared/components/ui/label";
import { useEffect, useState } from "react";
import DateRangePicker from "@/shared/components/ui/date-range-picker";
import useUpdateQueryString from "@/lib/use-update-query-string";
import { subDays } from "date-fns";

export default function DateFilter() {
  const updateRoute = useUpdateQueryString();

  const [date, setDate] = useState<{ from: Date; to: Date } | undefined>({
    from: subDays(new Date(), 20),
    to: new Date(),
  });

  const onDateChange = (date: { from: Date; to: Date }) => {
    setDate(date);
    updateRoute({
      start: date.from.toISOString(),
      end: date.to.toISOString(),
    });
  };

  return (
    <section>
      <div className="mb-2">
        <Label>Fecha de emisión</Label>
        <p className="text-sm text-muted-foreground">
          Rango de fechas a filtrar
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
