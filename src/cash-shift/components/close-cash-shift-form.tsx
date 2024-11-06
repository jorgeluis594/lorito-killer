"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input, MoneyInput } from "@/shared/components/ui/input";
import * as z from "zod";
import { FaCashRegister } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { closeCashShift } from "@/cash-shift/components/actions";
import { useToast } from "@/shared/components/ui/use-toast";
import { useState } from "react";
import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { ToastAction } from "@/shared/components/ui/toast";

const CashShiftFormSchema = z.object({
  finalAmount: z.coerce
    .number()
    .nonnegative("El monto inicial debe ser mayor o igual a 0"),
});

type CashShiftFormValues = z.infer<typeof CashShiftFormSchema>;

interface CloseCashShiftFormProps {
  onCashShiftClosed: () => void;
}

export default function CloseCashShiftForm({
  onCashShiftClosed,
}: CloseCashShiftFormProps) {
  const cashShift = useCashShift();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<CashShiftFormValues>({
    resolver: zodResolver(CashShiftFormSchema),
    defaultValues: { finalAmount: 0 },
  });

  const closeCashShiftUi = async (amount: number) => {
    const response = await closeCashShift(cashShift!, amount);

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
      onCashShiftClosed();
      router.refresh();
      form.reset();
      setOpen(false);
      router.push(`/dashboard/cash_shifts/${response.data.id}/reports`);
    }
  };

  const onSubmit = async (data: CashShiftFormValues) => {
    if (data.finalAmount === 0) {
      toast({
        title: "El monto de cierre es 0",
        description: `Estas seguro de cerrar caja con ${formatPrice(data.finalAmount)}`,
        variant: "destructive",
        action: (
          <ToastAction
            altText="Cerrar caja"
            onClick={() => closeCashShiftUi(data.finalAmount)}
          >
            Cerrar caja
          </ToastAction>
        ),
      });
      return;
    }

    await closeCashShiftUi(data.finalAmount);
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
                      <MoneyInput
                        placeholder="Monto final"
                        autoComplete="off"
                        type="number"
                        {...field}
                      />
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
