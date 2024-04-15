"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import * as z from "zod";
import { BadgeDollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const CashShiftFormSchema = z.object({
  initialAmount: z
    .number()
    .nonnegative("El monto inicial debe ser mayor o igual a 0"),
});

type ProductFormValues = z.infer<typeof CashShiftFormSchema>;

export default function CardShiftForm() {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(CashShiftFormSchema),
    defaultValues: { initialAmount: 0 },
  });

  const onSubmit = async (data: ProductFormValues) => {
    console.log(data);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-xs md:text-sm">
          <BadgeDollarSign className="w-4 h-4 mr-2" /> Abrir caja
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Abrir caja</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <FormField
                control={form.control}
                name="initialAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto inicial</FormLabel>
                    <FormControl>
                      <Input placeholder="Monto inicial" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" size="sm">
                Abrir
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
