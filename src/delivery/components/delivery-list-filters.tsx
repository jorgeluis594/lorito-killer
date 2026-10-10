"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/shared/components/ui/input";

const STATUS_OPTIONS = [
  { value: "", label: "Pendientes y despachados" },
  { value: "PENDING", label: "Pendientes" },
  { value: "DISPATCHED", label: "Despachados" },
  { value: "DELIVERED", label: "Entregados" },
];

/** Los filtros viven en la URL: la lista se renderiza en el servidor. */
export default function DeliveryListFilters({ today }: { today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes))
      value ? next.set(key, value) : next.delete(key);
    next.delete("cursor");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <Input
        type="search"
        aria-label="Buscar por nombre o teléfono"
        placeholder="Buscar por nombre o teléfono"
        autoComplete="off"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(
            () => update({ search: event.target.value.trim() }),
            300,
          );
        }}
      />
      <Input
        type="date"
        aria-label="Fecha"
        value={params.get("date") ?? today}
        onChange={(event) =>
          update({
            date: event.target.value === today ? "" : event.target.value,
          })
        }
      />
      <select
        aria-label="Estado"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={params.get("status") ?? ""}
        onChange={(event) => update({ status: event.target.value })}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
