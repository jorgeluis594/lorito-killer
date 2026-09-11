"use client";

import { useCategoryStore } from "@/category/components/category-store-provider";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { FilterBar } from "@/shared/components/ui/filter-bar";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import useUpdateQueryString from "@/lib/use-update-query-string";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
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

export function ProductsTableFilters() {
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const { categories } = useCategoryStore((store) => store);
  const categoryId = searchParams.get("categoryId") ?? "all";
  const showHidden = searchParams.get("showHidden") === "true";
  const withoutStock = searchParams.get("stock") === "zero";
  const query = searchParams.get("q") ?? "";
  const searchTimeout = useRef<number | undefined>(undefined);
  const queryInput = useRef<HTMLInputElement>(null);
  const filterCount = [categoryId !== "all", showHidden, withoutStock].filter(
    Boolean,
  ).length;

  const onCategoryChange = (value: string) => {
    updateRoute({ categoryId: value === "all" ? null : value, page: null });
  };

  const onCheckedChange = (checked: boolean) => {
    updateRoute({ showHidden: checked ? "true" : null, page: null });
  };

  useEffect(() => () => window.clearTimeout(searchTimeout.current), []);

  useEffect(() => {
    if (queryInput.current && document.activeElement !== queryInput.current) {
      queryInput.current.value = query;
    }
  }, [query]);

  const onQueryChange = (value: string) => {
    window.clearTimeout(searchTimeout.current);
    searchTimeout.current = window.setTimeout(
      () => updateRoute({ q: value.trim() || null, page: null }),
      350,
    );
  };

  return (
    <FilterBar
      role="group"
      aria-label="Filtros de productos"
      control={
        <Input
          ref={queryInput}
          type="search"
          aria-label="Buscar productos"
          placeholder="Buscar por nombre o código…"
          defaultValue={query}
          onChange={(event) => onQueryChange(event.target.value)}
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
          <SheetContent className="flex flex-col gap-6">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Refina el catálogo por categoría y disponibilidad.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-category">Categoría</Label>
              <Select value={categoryId} onValueChange={onCategoryChange}>
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id!}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="without-stock"
                checked={withoutStock}
                onCheckedChange={(checked) =>
                  updateRoute({ stock: checked ? "zero" : null, page: null })
                }
              />
              <Label
                htmlFor="without-stock"
                className="cursor-pointer font-normal"
              >
                Mostrar solo productos sin stock
              </Label>
            </div>
            <div className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="show-hidden"
                checked={showHidden}
                onCheckedChange={onCheckedChange}
              />
              <Label
                htmlFor="show-hidden"
                className="cursor-pointer font-normal"
              >
                Incluir productos ocultos
              </Label>
            </div>
            <SheetFooter className="mt-auto gap-2">
              <SheetClose asChild>
                <Button type="button">Listo</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      }
    />
  );
}
