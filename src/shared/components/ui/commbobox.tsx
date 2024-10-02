"use client";

import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

export interface Option {
  value: string;
  label: string;
}

interface ComboboxProps {
  value?: string;
  options: Option[];
  placeholder?: string;
  onChange?: (option: Option) => void;
}

export function Combobox({
  value,
  options,
  onChange,
  placeholder,
}: ComboboxProps) {
  console.log({ options });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-[200px] justify-between",
            !value && "text-muted-foreground",
          )}
        >
          {value && Array.isArray(options)
            ? options.find((option) => option.value === value)?.label
            : placeholder || "Select option"}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Buscar" className="h-9" />
          <CommandEmpty>No se encontro coincidencias</CommandEmpty>
          <CommandGroup>
            {Array.isArray(options) &&
              options.map((option) => (
                <CommandItem
                  value={option.value}
                  key={option.value}
                  onSelect={() => onChange && onChange(option)}
                >
                  {option.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      option.value === option.value
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
