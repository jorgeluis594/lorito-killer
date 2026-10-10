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
import { CircleDollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  closeCashShift,
  getUnpaidFulfillmentOrders,
} from "@/cash-shift/components/actions";
import type { UnpaidFulfillmentOrder } from "@/delivery/db_repository";
import { useToast } from "@/shared/components/ui/use-toast";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidFulfillmentOrder[]>(
    [],
  );

  const [checkingUnpaid, setCheckingUnpaid] = useState(false);

  // El aviso no bloquea el cierre: si la consulta falla, se cierra igual.
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    getUnpaidFulfillmentOrders()
      .then((result) => {
        if (!ignore) setUnpaidOrders(result.success ? result.data : []);
      })
      .catch(() => {
        if (!ignore) setUnpaidOrders([]);
      })
      .finally(() => {
        if (!ignore) setCheckingUnpaid(false);
      });
    return () => {
      ignore = true;
    };
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setUnpaidOrders([]);
      setCheckingUnpaid(true);
    }
    setOpen(next);
  };

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
        duration: 4000,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <CircleDollarSign aria-hidden="true" data-icon="inline-start" />
          Cerrar caja
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
            {checkingUnpaid && (
              <p role="status" className="mb-4 text-sm text-muted-foreground">
                Revisando pedidos sin cobrar…
              </p>
            )}
            {unpaidOrders.length > 0 && (
              <section
                role="status"
                aria-label="Pedidos sin cobrar"
                className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
              >
                <p className="font-medium">
                  Hay {unpaidOrders.length}{" "}
                  {unpaidOrders.length === 1
                    ? "pedido sin cobrar"
                    : "pedidos sin cobrar"}
                </p>
                <p className="mt-1">
                  Puedes cerrar la caja igual. Quedarán pendientes y se cobrarán
                  en la caja que esté abierta al cobrar.
                </p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {unpaidOrders.map((order) => (
                    <li
                      key={order.orderId}
                      className="flex items-center justify-between gap-2"
                    >
                      <Link
                        href={`/dashboard/orders/${order.orderId}`}
                        target="_blank"
                        className="min-w-0 truncate underline"
                      >
                        {order.customerLabel}
                        <span className="text-amber-800">
                          {" "}
                          · {order.statusLabel}
                        </span>
                      </Link>
                      <span className="shrink-0 font-medium">
                        {formatPrice(order.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <DialogFooter>
              <Button size="sm">Cerrar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
