"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useEffect } from "react";
import { es } from "date-fns/locale";

type DateRangePicker = {
  from: Date;
  to: Date;
};

interface DateRangePickerWithRangeProps {
  value?: DateRangePicker;
  placeholder?: string;
  onValueChange?: (date: DateRangePicker) => void;
}

export default function DateRangePicker({
  className,
  value,
  placeholder,
  onValueChange,
}: React.HTMLAttributes<HTMLDivElement> & DateRangePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: value?.from || subDays(new Date(), 20),
    to: value?.to || new Date(),
  });

  useEffect(() => {
    if (date?.from && date?.to) {
      onValueChange?.({ from: date.from, to: date.to });
    }
  }, [onValueChange, date]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className="justify-start text-left font-normal space-x-2"
          >
            <CalendarIcon />
            {date?.from ? (
              date.to ? (
                <span>
                  {format(date.from, "dd LLL, y", { locale: es })} -{" "}
                  {format(date.to, "dd LLL, y", { locale: es })}
                </span>
              ) : (
                <span>{format(date.from, "LLL dd, y", { locale: es })}</span>
              )
            ) : (
              <span>{placeholder || "Seleccione fechas"}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            locale={es}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
