"use client";

import CustomerApiSelector from "@/customer/components/customer-selector";
import type { Customer } from "@/customer/types";
import type { DocumentType } from "@/document/types";
import useUpdateQueryString from "@/lib/use-update-query-string";
import { reportDateRangeFromSearchParams } from "@/sale_report/search-params";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import DateRangePicker from "@/shared/components/ui/date-range-picker";
import { FilterBar } from "@/shared/components/ui/filter-bar";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import { endOfDay, startOfDay } from "date-fns";
import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const documentLabels: Record<DocumentType, string> = {
  invoice: "Facturas",
  receipt: "Boletas",
  ticket: "Notas de venta",
};

export default function FiltersWithHiddenButton({
  customer,
}: {
  customer?: Customer;
}) {
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const timeout = useRef<number | undefined>(undefined);
  const queryInput = useRef<HTMLInputElement>(null);
  const availableTypes: DocumentType[] = ["invoice", "receipt", "ticket"];
  const selectedTypes = availableTypes.filter(
    (type) => searchParams.get(type) === "true",
  );
  const query = searchParams.get("q") ?? "";
  const { startDate, endDate } = reportDateRangeFromSearchParams({
    start: searchParams.get("start") ?? undefined,
    end: searchParams.get("end") ?? undefined,
  });
  const filterCount =
    selectedTypes.length +
    Number(searchParams.has("customerId")) +
    Number(searchParams.has("start") || searchParams.has("end"));

  useEffect(() => () => window.clearTimeout(timeout.current), []);

  useEffect(() => {
    if (queryInput.current && document.activeElement !== queryInput.current) {
      queryInput.current.value = query;
    }
  }, [query]);

  const updateTypes = (types: string[]) =>
    updateRoute({
      invoice: types.includes("invoice") ? "true" : null,
      receipt: types.includes("receipt") ? "true" : null,
      ticket: types.includes("ticket") ? "true" : null,
      page: null,
    });

  return (
    <FilterBar
      role="group"
      aria-label="Filtros de ventas"
      control={
        <Input
          ref={queryInput}
          type="search"
          aria-label="Buscar por cliente o documento"
          placeholder="Buscar por cliente o documento…"
          defaultValue={query}
          onChange={(event) => {
            const value = event.target.value;
            window.clearTimeout(timeout.current);
            timeout.current = window.setTimeout(
              () => updateRoute({ q: value.trim() || null, page: null }),
              350,
            );
          }}
          onBlur={(event) => {
            event.currentTarget.value = query;
          }}
        />
      }
      action={
        <Sheet>
          <SheetTrigger asChild>
            <FilterBar.FilterTrigger>
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Filtros{filterCount ? ` (${filterCount})` : ""}
            </FilterBar.FilterTrigger>
          </SheetTrigger>
          <SheetContent className="flex flex-col gap-6 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Refina las ventas por fecha, cliente y tipo de documento.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-2">
              <Label>Fecha de emisión</Label>
              <DateRangePicker
                value={{ from: startDate, to: endDate }}
                onValueChange={(date) =>
                  updateRoute({
                    start: startOfDay(date.from).toISOString(),
                    end: endOfDay(date.to).toISOString(),
                    page: null,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cliente</Label>
              <div className="flex items-center gap-2">
                <CustomerApiSelector
                  value={customer}
                  showAll
                  placeHolder="Todos los clientes"
                  onSelect={(selected) =>
                    updateRoute({ customerId: selected.id, page: null })
                  }
                />
                {customer ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Quitar filtro de cliente"
                    onClick={() =>
                      updateRoute({ customerId: null, page: null })
                    }
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium">
                Tipos de documento
              </legend>
              {availableTypes.map((type) => (
                <div key={type} className="flex min-h-11 items-center gap-3">
                  <Checkbox
                    id={`document-${type}`}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) =>
                      updateTypes(
                        checked
                          ? [...selectedTypes, type]
                          : selectedTypes.filter((value) => value !== type),
                      )
                    }
                  />
                  <Label
                    htmlFor={`document-${type}`}
                    className="cursor-pointer font-normal"
                  >
                    {documentLabels[type]}
                  </Label>
                </div>
              ))}
            </fieldset>
            <SheetFooter className="mt-auto">
              <SheetClose asChild>
                <Button type="button">Listo</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      }
    >
      <FilterBar.QuickFilters>
        <ToggleGroup
          type="multiple"
          value={selectedTypes}
          onValueChange={updateTypes}
          aria-label="Tipos de documento"
          className="flex-wrap justify-start"
        >
          {availableTypes.map((type) => (
            <ToggleGroupItem
              key={type}
              value={type}
              className="h-auto min-h-11 px-4 py-2"
            >
              {documentLabels[type]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FilterBar.QuickFilters>
    </FilterBar>
  );
}
