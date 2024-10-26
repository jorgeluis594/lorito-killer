"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { es } from "date-fns/locale";

interface DatePickerProps {
  placeHolder?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
}

export function DatePicker({ placeHolder, value, onChange }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className="w-[280px] justify-start text-left space-x-1 font-normal"
        >
          <CalendarIcon />
          {value ? (
            format(value, "PPP")
          ) : (
            <span>{placeHolder || "Seleccione fecha"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={es}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
