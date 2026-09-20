"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useFeatureEnabled } from "@/feature-flags/client";
import { getKitchenOptions } from "@/kitchen/actions";
import type { KitchenOption } from "@/kitchen/types";
import { useUserSession } from "@/lib/use-user-session";
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

export function KitchenDestinationField() {
  const { control } = useFormContext<{ kitchenId?: string | null }>();
  const user = useUserSession();
  const enabled = useFeatureEnabled("restaurants");
  const [kitchens, setKitchens] = useState<KitchenOption[]>([]);
  const visible = enabled && user?.role === "ADMIN";

  useEffect(() => {
    if (!visible) return;
    void getKitchenOptions().then((result) => {
      if (result.success) setKitchens(result.data);
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <FormField
      control={control}
      name="kitchenId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Destino de preparación</FormLabel>
          <Select
            value={field.value ?? "UNASSIGNED"}
            onValueChange={(value) =>
              field.onChange(value === "UNASSIGNED" ? null : value)
            }
          >
            <FormControl>
              <SelectTrigger ref={field.ref} onBlur={field.onBlur}>
                <SelectValue placeholder="Sin destino" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="UNASSIGNED">Sin destino</SelectItem>
                {kitchens.map((kitchen) => (
                  <SelectItem key={kitchen.id} value={kitchen.id}>
                    {kitchen.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormDescription>
            Se aplica a los próximos envíos de este producto.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
