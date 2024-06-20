"use client";

import { InferProductType, ProductType } from "@/product/types";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
} from "@/shared/components/ui/command";

export interface ProductSelectorProps<T extends ProductType> {
  value: InferProductType<T> | undefined;
  onSelect: (product: InferProductType<T> | undefined) => void;
  productType: T;
}

export default function ProductSelectorProps<T extends ProductType>({
  value,
  onSelect,
  productType,
}: ProductSelectorProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          type="button"
          aria-expanded={open}
          className="justify-between"
        >
          {value ? value.name : "Seleccione un producto"}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command>
          <CommandList>
            <CommandEmpty>No se encontro ningun producto</CommandEmpty>
            <CommandGroup></CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
