"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  DashboardCashShiftOption,
  DashboardFilterState,
  DashboardSellerOption,
  DashboardPeriod,
} from "@/dashboard/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last_7_days", label: "Ultimos 7 dias" },
  { value: "this_month", label: "Este mes" },
  { value: "custom", label: "Personalizado" },
];

export function DashboardFilters({
  value,
  cashShifts,
  sellers,
}: {
  value: DashboardFilterState;
  cashShifts: DashboardCashShiftOption[];
  sellers: DashboardSellerOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, nextValue);
    params.delete("page");

    if (key === "period" && nextValue !== "custom") {
      params.delete("start");
      params.delete("end");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[180px_180px_180px_150px_150px]">
      <div className="space-y-1.5">
        <Label>Periodo</Label>
        <Select
          value={value.period}
          onValueChange={(nextValue) => updateFilter("period", nextValue)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Caja</Label>
        <Select
          value={value.cashShiftId}
          onValueChange={(nextValue) => updateFilter("cashShiftId", nextValue)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las cajas</SelectItem>
            {cashShifts.map((cashShift) => (
              <SelectItem key={cashShift.id} value={cashShift.id}>
                {cashShift.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Vendedor</Label>
        <Select
          value={value.sellerId}
          onValueChange={(nextValue) => updateFilter("sellerId", nextValue)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los vendedores</SelectItem>
            {sellers.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>
                {seller.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Inicio</Label>
        <Input
          type="date"
          value={value.start}
          disabled={value.period !== "custom"}
          onChange={(event) => updateFilter("start", event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Fin</Label>
        <Input
          type="date"
          value={value.end}
          disabled={value.period !== "custom"}
          onChange={(event) => updateFilter("end", event.target.value)}
        />
      </div>
    </div>
  );
}
