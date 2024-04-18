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
import { FaCashRegister } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { closeCashShift } from "@/cash-shift/components/actions";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";

const CashShiftFormSchema = z.object({
  finalAmount: z.coerce
    .number()
    .nonnegative("El monto inicial debe ser mayor o igual a 0"),
});

type CashShiftFormValues = z.infer<typeof CashShiftFormSchema>;

export default function OpenCashShiftForm() {
  const { cashShift, removeCashShift } = useCashShiftStore((store) => store);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CashShiftFormValues>({
    resolver: zodResolver(CashShiftFormSchema),
    defaultValues: { finalAmount: cashShift!.initialAmount },
  });

  const onSubmit = async (data: CashShiftFormValues) => {
    const response = await closeCashShift(cashShift!, data.finalAmount);

    if (!response.success) {
      toast({
        title: "Error",
        description: "Ocurrió un error al cerrar la caja: " + response.message,
        variant: "destructive",
      });
      return;
    } else {
      toast({
        title: "Exito!",
        description: "Caja cerrada correctamente",
      });
      removeCashShift();
      form.reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-xs md:text-sm">
          <FaCashRegister className="w-4 h-4 mr-2" /> Cerrar caja
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Cerrar caja</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <FormField
                control={form.control}
                name="finalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto final</FormLabel>
                    <FormControl>
                      <Input placeholder="Monto final" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button size="sm">Cerrar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
