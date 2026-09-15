"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useToast } from "@/shared/components/ui/use-toast";
import { cancelRoundItemAction } from "../actions";
import { cancelFulfillmentRoundItem } from "@/order/rounds/fulfillment-actions";

export function CancelOrderItemDialog({
  orderRoundItemId,
  availableQuantity,
  channel = "table",
}: {
  orderRoundItemId?: string;
  availableQuantity: number;
  channel?: "table" | "fulfillment";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [quantity, setQuantity] = useState(availableQuantity);
  const [pending, setPending] = useState(false);
  const cancellationId = useRef(crypto.randomUUID());

  const cancelItem = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!orderRoundItemId) return;

    setPending(true);
    const result = await (
      channel === "table" ? cancelRoundItemAction : cancelFulfillmentRoundItem
    )({
      cancellationId: cancellationId.current,
      orderRoundItemId,
      quantity,
      reason: reason.trim() || undefined,
    });
    setPending(false);
    if (!result.success) {
      toast({
        title: "No se pudo cancelar",
        description: result.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Producto cancelado" });
    cancellationId.current = crypto.randomUUID();
    setReason("");
    router.refresh();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Ban data-icon="inline-start" />
          Cancelar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar producto</AlertDialogTitle>
          <AlertDialogDescription>
            Indica cuántos platos dejarán de cobrarse. El motivo es opcional.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          type="number"
          min={1}
          max={availableQuantity}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          aria-label="Cantidad a cancelar"
          disabled={pending}
        />
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          placeholder="Motivo de cancelación"
          aria-label="Motivo de cancelación"
          disabled={pending}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={cancelItem}
            disabled={
              pending ||
              !orderRoundItemId ||
              quantity <= 0 ||
              quantity > availableQuantity
            }
          >
            Confirmar cancelación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
