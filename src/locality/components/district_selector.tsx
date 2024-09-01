"use client";

import {useToast} from "@/shared/components/ui/use-toast";
import {debounce} from "@/lib/utils";
import {Popover, PopoverContent, PopoverTrigger,} from "@/shared/components/ui/popover";
import {Button} from "@/shared/components/ui/button";
import {CaretSortIcon} from "@radix-ui/react-icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import {getMany} from "@/locality/api_repository";
import * as React from "react";
import {useEffect, useState} from "react";
import {
  DISTRICT,
  District,
  DistrictLevelType,
  InferLocalityType,
  LocalityLevelType,
  LocalityType,
  PROVINCE
} from "@/locality/types";

export interface DistrictSelectorProps{
  value?: District;
  onSelect?: (locality: District) => void;
}

export default function DistrictSelector({
  value,
  onSelect,
}: DistrictSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [localities, setLocalities] = useState<District[]>([]);
  const {toast} = useToast();

  const searchLocalities = async (q: string) => {
    const response = await getMany({q: q, localityLevel: "District"});

    if (response.success) {
      setLocalities(response.data);
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: response.message,
      });
    }
  };

  const onSearchSubmit = debounce(searchLocalities, 200);

  useEffect(() => {
    onSearchSubmit(search);
  }, [search]);

  const onLocalitySelect = (localityId: string) => {
    const locality = localities.find((l) => l.id === localityId);
    if (locality) {
      onSelect && onSelect(locality);
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
          className="justify-between w-96"
        >
          {value ? value.name : "Seleccione Departamento"}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            placeholder="Nombre del Departamento"
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontro ningun cliente</CommandEmpty>
            <CommandGroup>
              {localities.map((locality) => (
                <CommandItem
                  key={locality.id}
                  value={locality.id}
                  onSelect={onLocalitySelect}
                >
                  <span>{locality.name}</span>/
                  <span>{locality.provinceName}</span>/
                  <span>{locality.departmentName}</span>
                </CommandItem>)
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
