import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatPrice } from "@/lib/utils";

export const formatDashboardCurrency = (value: number) => formatPrice(value);

export const formatDashboardNumber = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 2,
  }).format(value);

export const formatDashboardTime = (date: Date) => format(date, "HH:mm");

export const formatDashboardDateRange = (start: Date, end: Date) => {
  const sameDay = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");
  if (sameDay) return format(start, "dd MMM yyyy", { locale: es });

  return `${format(start, "dd MMM", { locale: es })} - ${format(end, "dd MMM yyyy", { locale: es })}`;
};
