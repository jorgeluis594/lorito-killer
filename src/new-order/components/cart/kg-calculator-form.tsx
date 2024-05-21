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
import { mul } from "@/lib/utils";

interface KgStockSetterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValue: number;
  product: Product;
  onChange: (value: number) => void;
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
  onChange,
}) => {
  const form = useForm<KgCalculatorFormValues>({
    resolver: zodResolver(kgCalculatorSchema),
    defaultValues: { kg: defaultValue, amount: 1 },
  });

  const kgInputHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const kg = Number(e.target.value);
    const amount = mul(kg)(product.price);
    form.setValue("amount", amount);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form id="kg-calculator-form">
            <DialogHeader>
              <DialogTitle>Venta por KG</DialogTitle>
              <DialogDescription>
                Cálcula el costo de tus productos por KG
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 grid-cols-2">
              <FormField
                control={form.control}
                name="kg"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Input
                          id="kg-calculator-input"
                          className="col-span-4"
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
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <MoneyInput
                          id="kg-calculator-amount-input"
                          className="col-span-4"
                          {...field}
                        />
                        <FormMessage className="col-span-4" />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              {
                // button submit form
              }
              {/*<Button
                type="button"
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
              >
                Agregar categoría
              </Button>*/}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default KgCalculatorForm;
