"use client";

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Calendar } from "./calendar";
import { DatePicker } from "./date-picker";
import DateRangePicker from "./date-range-picker";
import { DateTimePicker } from "./date-time-picker";
import { TimePeriodSelect } from "./period-select";
import { TimePickerInput } from "./time-picker-input";
import { TimePicker } from "./time-picker";
import type { Period } from "./time-picker-utils";

const initialDate = new Date(2026, 8, 9, 14, 30);
const meta = { title: "UI/Date and time", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function CalendarDemo() {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  return <Calendar mode="single" selected={date} onSelect={setDate} />;
}

export const CalendarView: Story = { render: () => <CalendarDemo /> };

function DatePickerDemo() {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  return <DatePicker value={date} onChange={setDate} />;
}

export const SingleDate: Story = { render: () => <DatePickerDemo /> };

export const DateRange: Story = {
  render: () => <DateRangePicker value={{ from: initialDate, to: new Date(2026, 8, 15) }} />,
};

function DateTimeDemo() {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  return date ? <DateTimePicker value={date} onChange={setDate} /> : null;
}

export const DateAndTime: Story = { render: () => <DateTimeDemo /> };

function TimeDemo() {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [period, setPeriod] = useState<Period>("PM");
  return (
    <div className="grid gap-5">
      <TimePicker date={date} setDate={setDate} />
      <div className="flex items-center gap-2">
        <TimePickerInput picker="hours" date={date} setDate={setDate} />
        <TimePeriodSelect period={period} setPeriod={setPeriod} date={date} setDate={setDate} />
      </div>
    </div>
  );
}

export const TimeControls: Story = { render: () => <TimeDemo /> };
