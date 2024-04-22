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
import { createCashShift } from "@/cash-shift/components/actions";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";
import { useRouter } from "next/navigation";
import { useOrderFormActions } from "@/components/forms/order-form/order-form-provider";
import { signOut } from "next-auth/react";

const CashShiftFormSchema = z.object({
  initialAmount: z.coerce
    .number()
    .nonnegative("El monto inicial debe ser mayor o igual a 0"),
});

type CashShiftFormValues = z.infer<typeof CashShiftFormSchema>;

export default function OpenCashShiftForm() {
  const { data: session } = useSession();
  const { setCashShift } = useCashShiftStore((store) => store);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setCashShift: serCashShiftToOrder } = useOrderFormActions();

  const form = useForm<CashShiftFormValues>({
    resolver: zodResolver(CashShiftFormSchema),
    defaultValues: { initialAmount: 0 },
  });

  const onSubmit = async (data: CashShiftFormValues) => {
    const response = await createCashShift(
      session!.user!.email!,
      data.initialAmount,
    );

    if (!response.success && response.type === "AuthError") {
      toast({
        title: "Error",
        description: "Inicia sesión de nuevo",
        variant: "destructive",
      });
      await signOut({ callbackUrl: "/login" });
      return;
    }

    if (!response.success) {
      toast({
        title: "Error",
        description: "Ocurrió un error al abrir la caja: " + response.message,
        variant: "destructive",
      });
      return;
    } else {
      toast({
        title: "Exito!",
        description: "Caja abierta correctamente",
      });
      setCashShift(response.data);
      serCashShiftToOrder(response.data);
      router.refresh();
      form.reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Button size="sm">Abrir</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
