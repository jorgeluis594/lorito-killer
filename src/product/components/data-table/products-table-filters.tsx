"use client";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import useUpdateQueryString from "@/lib/use-update-query-string";
import { useSearchParams } from "next/navigation";

export function ProductsTableFilters() {
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const showHidden = searchParams.get("showHidden") === "true";

  const onCheckedChange = (checked: boolean) => {
    updateRoute({ showHidden: checked ? "true" : null, page: null });
  };

  return (
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
  );
}
