"use client";

import { useFormContext } from "react-hook-form";
import type { PreparationStation } from "@/product/types";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export function PreparationStationField() {
  const { control } = useFormContext<{
    preparationStation?: PreparationStation | null;
  }>();
  return (
    <FormField
      control={control}
      name="preparationStation"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Estación de preparación</FormLabel>
          <Select
            value={field.value ?? "UNASSIGNED"}
            onValueChange={(value) =>
              field.onChange(value === "UNASSIGNED" ? null : value)
            }
          >
            <FormControl>
              <SelectTrigger ref={field.ref} onBlur={field.onBlur}>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="UNASSIGNED">Sin configurar</SelectItem>
                <SelectItem value="KITCHEN">Cocina</SelectItem>
                <SelectItem value="BAR">Barra</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormDescription>
            Se aplica a los próximos envíos. Sin configurar requiere atención
            del administrador.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
