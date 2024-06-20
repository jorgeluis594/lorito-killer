"use client";

import React from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/shared/components/ui/form";

import { useForm } from "react-hook-form";
import { HelpTooltip } from "@/shared/components/ui/help-tooltip";
import { DateTimePicker } from "@/shared/components/ui/date-time-picker";

const StockAdjustmentSchema = z.object({
  productId: z.string(),
  type: z.enum(["INCREASE", "DECREASE"]),
  quantity: z.number(),
});

const BatchStockAdjustmentSchema = z.object({
  createdAt: z.date(),
  observation: z.string(),
  adjustments: z.array(StockAdjustmentSchema),
});

type BatchStockAdjustmentFormValues = z.infer<
  typeof BatchStockAdjustmentSchema
>;

export default function StockAdjustmentForm() {
  const form = useForm<BatchStockAdjustmentFormValues>({
    resolver: zodResolver(BatchStockAdjustmentSchema),
    defaultValues: {
      createdAt: new Date(),
      observation: "",
      adjustments: [],
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(() => {
          console.log("hello world");
        })}
        className="mx-auto space-y-8 my-4"
      >
        <div className="space-y-4 p-2">
          <FormField
            control={form.control}
            name="createdAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex">
                  Fecha
                  <HelpTooltip text="Fecha en que se realizo el ajuste de stock" />
                </FormLabel>
                <FormControl>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
