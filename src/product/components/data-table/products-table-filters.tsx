"use client";

import { useCategoryStore } from "@/category/components/category-store-provider";
import { Checkbox } from "@/shared/components/ui/checkbox";
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

export function ProductsTableFilters() {
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const { categories } = useCategoryStore((store) => store);
  const categoryId = searchParams.get("categoryId") ?? "all";
  const showHidden = searchParams.get("showHidden") === "true";

  const onCategoryChange = (value: string) => {
    updateRoute({ categoryId: value === "all" ? null : value, page: null });
  };

  const onCheckedChange = (checked: boolean) => {
    updateRoute({ showHidden: checked ? "true" : null, page: null });
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="w-full md:w-72">
        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger>
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
      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-hidden"
          checked={showHidden}
          onCheckedChange={onCheckedChange}
        />
        <Label
          htmlFor="show-hidden"
          className="text-sm font-normal cursor-pointer"
        >
          Incluir ocultos
        </Label>
      </div>
    </div>
  );
}
