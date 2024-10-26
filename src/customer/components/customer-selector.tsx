"use client";

import { useToast } from "@/shared/components/ui/use-toast";
import { debounce } from "@/lib/utils";
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
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { CustomerType, DNI, InferCustomerType, RUC } from "@/customer/types";
import { getMany } from "@/customer/api_repository";
import * as React from "react";
import { useEffect, useState } from "react";
import { fullName } from "@/customer/utils";
import { useOrderFormStore } from "@/new-order/order-form-provider";

export interface CustomerSelectorProps<T extends CustomerType | undefined> {
  value?: InferCustomerType<T>;
  onSelect?: (customer: InferCustomerType<T>) => void;
  skipCustomerIds?: string[];
  placeHolder?: string;
  customerType?: T;
}

export default function CustomerSelector<T extends CustomerType | undefined>({
  value,
  onSelect,
  customerType,
  placeHolder,
}: CustomerSelectorProps<T>) {
  const order = useOrderFormStore((state) => state.order);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<InferCustomerType<T>[]>([]);
  const { toast } = useToast();

  const naturalCustomer = customers.filter(
    (customer) => customer.documentType === DNI,
  );
  const businessCustomer = customers.filter(
    (customer) => customer.documentType === RUC,
  );

  const searchCustomers = async (q: string) => {
    const response = await getMany({ q: q, customerType });

    if (response.success) {
      setCustomers(response.data);
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
        <Button
          variant="outline"
          role="combobox"
          type="button"
          aria-expanded={open}
          className="justify-between w-full max-w-96"
        >
          {value
            ? fullName(value)
            : order.documentType === "ticket" ||
                order.documentType === "receipt"
              ? placeHolder || "Cliente General"
              : "Seleccione un Cliente "}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            placeholder="Nombre o dni de cliente"
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontro ningun cliente</CommandEmpty>
            <CommandGroup>
              {order.documentType === "ticket" ||
              order.documentType === "receipt"
                ? naturalCustomer.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={onCustomerSelect}
                    >
                      <span>{fullName(customer)}</span>
                    </CommandItem>
                  ))
                : businessCustomer.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={onCustomerSelect}
                    >
                      <span>{fullName(customer)}</span>
                    </CommandItem>
                  ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
