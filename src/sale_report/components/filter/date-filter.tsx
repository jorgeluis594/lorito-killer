"use client";

import { Label } from "@/shared/components/ui/label";
import { useState } from "react";
import DateRangePicker from "@/shared/components/ui/date-range-picker";
import { subDays } from "date-fns";

export default function DateFilter() {
  const [date, setDate] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 20),
    to: new Date(),
  });

  return (
    <>
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
          onValueChange={setDate}
        />
      </section>
    </>
  );
}
