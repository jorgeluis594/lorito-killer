"use client";

import {InferProductType} from "@/product/types";
import {useToast} from "@/shared/components/ui/use-toast";
import {debounce} from "@/lib/utils";
import {Popover, PopoverContent, PopoverTrigger} from "@/shared/components/ui/popover";
import {Button} from "@/shared/components/ui/button";
import {CaretSortIcon} from "@radix-ui/react-icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/shared/components/ui/command";
import {CustomerType, GetManyParamsCustomer, InferCustomerType} from "@/customer/types";
import {getMany} from "@/customer/api_repository";
import * as React from "react";
import {useEffect, useState} from "react";

export interface CustomerelectorProps<T extends CustomerType | undefined> {
  value?: InferCustomerType<T>;
  onSelect?: (customer: InferCustomerType<T>) => void;
  skipCustomerIds?: string[];
  customerType?: T;
}

export default function CustomerSelector<T extends CustomerType | undefined>({
  value,
  onSelect,
  customerType,
  skipCustomerIds = [],
  }: CustomerelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomer] = useState<InferCustomerType<T>[]>([]);
  const {toast} = useToast();

  const setSkipCustomerIds = new Set(skipCustomerIds);

  const searchCustomers = async (q: string) => {
    const params: GetManyParamsCustomer<T> = {
      sortBy: "fullName_asc",
      customerType,
    };
    if (q.length || q !== "") {
      params["q"] = q;
    }
    if (q.length === 0) {
      params["limit"] = 20;
    }
    const response = await getMany(params);

    if (response.success) {
      setCustomer(response.data.filter((c) => !setSkipCustomerIds.has(c.id!)));
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: response.message,
      });
    }
  };

  const onSearchSubmit = debounce(searchCustomers, 200);

  useEffect(() => {
    onSearchSubmit(search);
  }, [search]);

  const onCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      onSelect && onSelect(customer);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        Cliente:
        <Button
          variant="outline"
          role="combobox"
          type="button"
          aria-expanded={open}
          className="justify-between w-full"
        >
          {value ? value.email : "Seleccione un cliente"}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
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
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={onCustomerSelect}
                >
                  <span>{customer.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
