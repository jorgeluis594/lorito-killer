"use client";

import { InferProductType, Product, ProductType } from "@/product/types";
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
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/use-toast";
import { debounce } from "@/lib/utils";

export interface ProductSelectorProps<T extends ProductType> {
  value?: InferProductType<T>;
  onSelect?: (product: InferProductType<T> | undefined) => void;
  productType: T;
}

export default function ProductSelector<T extends ProductType>({
  value,
  onSelect,
  productType,
}: ProductSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  const searchProducts = async () => {
    const params: GetManyParams = { sortBy: "name_asc" };
    if (search.length || search !== "") {
      params["q"] = search;
    }
    if (search.length === 0) {
      params["limit"] = 20;
    }
    const response = await getMany(params);

    if (response.success) {
      setProducts(response.data);
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
    onSearchSubmit();
  }, [search]);

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
          <Input
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Busque su producto"
          ></Input>
          <CommandList>
            <CommandEmpty>No se encontro ningun producto</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem key={product.id}>
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
