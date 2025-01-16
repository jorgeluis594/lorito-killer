"use client";

import { InferProductType, ProductType } from "@/product/types";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { getMany, type GetManyParams } from "@/product/api_repository";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { useToast } from "@/shared/components/ui/use-toast";
import { debounce } from "@/lib/utils";
import * as React from "react";

export interface ProductSelectorProps<T extends ProductType | undefined> {
  value?: InferProductType<T>;
  onSelect?: (product: InferProductType<T>) => void;
  skipProductIds?: string[];
  productType?: T;
}

export default function ProductSelector<T extends ProductType | undefined>({
  value,
  onSelect,
  productType,
  skipProductIds = [],
}: ProductSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<InferProductType<T>[]>([]);
  const { toast } = useToast();

  const setSkipProductIds = new Set(skipProductIds);

  const searchProducts = async (q: string) => {
    const params: GetManyParams<T> = {
      sortBy: "name_asc",
      productType,
    };
    if (q.length || q !== "") {
      params["q"] = q;
    }
    if (q.length === 0) {
      params["limit"] = 20;
    }
    const response = await getMany(params);

    if (response.success) {
      setProducts(response.data.filter((p) => !setSkipProductIds.has(p.id!)));
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: response.message,
      });
    }
  };

  const onSearchSubmit = debounce(searchProducts, 200);

  useEffect(() => {
    onSearchSubmit(search);
  }, [search]);

  const onProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      onSelect && onSelect(product);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          type="button"
          aria-expanded={open}
          className="justify-between w-full"
        >
          {value ? value.name : "Seleccione un producto"}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            placeholder="Busque su producto"
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontro ningun producto</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={onProductSelect}
                >
                  <span>{product.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
