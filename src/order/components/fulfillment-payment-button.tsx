"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import { confirmFulfillmentPayment } from "@/order/fulfillment-payment-actions";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from "@/shared/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";

export default function FulfillmentPaymentButton({
  orderId,
  orderVersion,
  total,
}: {
  orderId: string;
  orderVersion: string;
  total: number;
}) {
  const cashShift = useCashShift();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"cash" | "debit_card" | "credit_card">(
    "cash",
  );
  const [cashReceived, setCashReceived] = useState(total);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function pay() {
    if (!cashShift) return;
    startTransition(async () => {
      const result = await confirmFulfillmentPayment({
        orderId,
        orderVersion,
        expectedTotal: total,
        cashShiftId: cashShift.id,
        method,
        receipt: { documentType: "ticket" },
        ...(method === "cash" ? { cashReceived } : {}),
      });
      if (!result.success) {
        toast({ variant: "destructive", description: result.message });
        return;
      }
      toast({
        title: "Pago confirmado",
        description: "El pedido sigue pendiente de entrega.",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Cobrar {formatPrice(total)}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobrar pedido</DialogTitle>
        </DialogHeader>
        <Select
          value={method}
          onValueChange={(value) => setMethod(value as typeof method)}
        >
          <SelectTrigger aria-label="Medio de pago">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Efectivo</SelectItem>
            <SelectItem value="debit_card">Tarjeta débito</SelectItem>
            <SelectItem value="credit_card">Tarjeta crédito</SelectItem>
          </SelectContent>
        </Select>
        {method === "cash" && (
          <Input
            type="number"
            step="0.01"
            min={total}
            aria-label="Efectivo recibido"
            value={cashReceived}
            onChange={(event) => setCashReceived(Number(event.target.value))}
          />
        )}
        <DialogFooter>
          <Button disabled={!cashShift || pending} onClick={pay}>
            {pending ? "Cobrando…" : "Confirmar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
