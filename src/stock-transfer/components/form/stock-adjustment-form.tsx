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
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import StockAdjustmentFields from "@/stock-transfer/components/form/stock-adjustment-fields";
import { Button } from "@/shared/components/ui/button";
import { Save } from "lucide-react";
import {
  type TypeAdjustmentStockTransfer,
  AdjustmentStockTransfer,
} from "@/stock-transfer/types";
import { mul } from "@/lib/utils";
import { useUserSession } from "@/lib/use-user-session";
import { createAndProcessStockTransfers } from "@/stock-transfer/components/actions";
import { useToast } from "@/shared/components/ui/use-toast";
import { User } from "@/user/types";
import { useRouter } from "next/navigation";

const StockAdjustmentSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  productName: z.string().optional(), // We add product Name to avoid fetching the product again
  type: z.enum(["INCREASE", "DECREASE"]),
  quantity: z.coerce.number().positive(),
});

const BatchStockAdjustmentSchema = z.object({
  createdAt: z.date(),
  observation: z.string(),
  adjustments: z.array(StockAdjustmentSchema),
});

type StockAdjustmentFormValues = z.infer<typeof StockAdjustmentSchema>;

type BatchStockAdjustmentFormValues = z.infer<
  typeof BatchStockAdjustmentSchema
>;

const adjustmentToStockTransfer = (
  adjustment: StockAdjustmentFormValues,
  user: User,
  batchId: string,
): TypeAdjustmentStockTransfer => ({
  id: adjustment.id!,
  userId: user.id,
  status: "pending",
  companyId: user.companyId,
  productId: adjustment.productId!,
  productName: adjustment.productName || "DUMMY_PRODUCT_NAME",
  type: AdjustmentStockTransfer,
  batchId: batchId,
  value: mul(adjustment.quantity)(adjustment.type === "INCREASE" ? 1 : -1),
  createdAt: new Date(),
});

interface StockAdjustmentFormProps {
  onSubmit?: (data: BatchStockAdjustmentFormValues) => void;
}

export default function StockAdjustmentForm({
  onSubmit: onFormSubmit,
}: StockAdjustmentFormProps) {
  const session = useUserSession();
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<BatchStockAdjustmentFormValues>({
    resolver: zodResolver(BatchStockAdjustmentSchema),
    defaultValues: {
      createdAt: new Date(),
      observation: "",
      adjustments: [],
    },
  });

  const onSubmit = async (data: BatchStockAdjustmentFormValues) => {
    const batchId = crypto.randomUUID();

    const stockTransfers = data.adjustments.map((adjustment) =>
      adjustmentToStockTransfer(adjustment, session!, batchId),
    );

    const responses = await createAndProcessStockTransfers(stockTransfers);
    if (responses.some((r) => !r.success)) {
      toast({
        description: "Algunos ajustes no pudieron ser procesados",
        variant: "destructive",
      });
    } else {
      onFormSubmit && onFormSubmit(data);
      router.refresh();
      toast({
        description: "Ajustes procesados correctamente",
      });
    }
  };

  const adjustments = form.watch("adjustments");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
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
          <div className="w-1/2">
            <FormField
              name="observation"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observación</FormLabel>
                  <FormControl>
                    <Textarea className="w-72 md:w-full" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
        <Separator className="my-6" />
        <FormField
          name="adjustments"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                  <StockAdjustmentFields
                    value={field.value}
                    onChange={field.onChange}
                  />
              </FormControl>
            </FormItem>
          )}
        />
        {adjustments.length > 0 && (
          <div className="flex justify-center mr-5 md:justify-end">
            <Button>
              <Save className="h-4 w-4 mr-2" /> Guardar
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
