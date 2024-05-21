"use client";

import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input, MoneyInput } from "@/shared/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangeEvent } from "react";
import { Product } from "@/product/types";
import { div, mul } from "@/lib/utils";
import { Label } from "@/shared/components/ui/label";

interface KgStockSetterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValue: number;
  product: Product;
  onSubmit: (kg: number) => void;
}

const kgCalculatorSchema = z.object({
  kg: z.coerce.number().positive({ message: "Debe ser un número positivo" }),
  amount: z.coerce
    .number()
    .positive({ message: "Debe ser un número positivo" }),
});

type KgCalculatorFormValues = z.infer<typeof kgCalculatorSchema>;

const KgCalculatorForm: React.FC<KgStockSetterFormProps> = ({
  open,
  onOpenChange,
  defaultValue,
  product,
  onSubmit,
}) => {
  const form = useForm<KgCalculatorFormValues>({
    resolver: zodResolver(kgCalculatorSchema),
    defaultValues: {
      kg: defaultValue,
      amount: mul(defaultValue)(product.price),
    },
  });

  const kgInputHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const kg = Number(e.target.value);
    const amount = mul(kg)(product.price);
    form.setValue("amount", amount);
  };

  const amountInputHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const amount = Number(e.target.value);
    const kg = div(amount)(product.price);
    form.setValue("kg", parseFloat(kg.toFixed(3)));
  };

  const onFormSubmit = (data: KgCalculatorFormValues) => {
    onSubmit(data.kg);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form id="kg-calculator-form">
            <DialogHeader>
              <DialogTitle>Venta por KG</DialogTitle>
              <DialogDescription>
                Cálcula el costo de tus productos por KG
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-4 py-4 justify-between">
              <FormField
                control={form.control}
                name="kg"
                render={({ field }) => (
                  <FormItem className="w-5/12">
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="col-span-1 text-right">KG</Label>
                        <Input
                          id="kg-calculator-input"
                          className="col-span-3"
                          type="number"
                          {...{
                            ...field,
                            onChange: (e) => {
                              kgInputHandler(e);
                              field.onChange(e);
                            },
                          }}
                        />
                        <FormMessage className="col-span-4" />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="w-5/12">
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="col-span-1 text-right">S/</Label>
                        <Input
                          id="kg-calculator-amount-input"
                          className="col-span-3"
                          {...{
                            ...field,
                            onChange: (e) => {
                              field.onChange(e);
                              amountInputHandler(e);
                            },
                          }}
                        />
                        <FormMessage className="col-span-4" />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                size="sm"
                onClick={form.handleSubmit(onFormSubmit)}
              >
                Agregar producto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default KgCalculatorForm;
