"use client";

import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { cancelOrder } from "@/order/actions";
import { useToast } from "@/shared/components/ui/use-toast";
import { useState, useTransition } from "react";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { useRouter } from "next/navigation";

const CancelOrderButton = ({
  orderId,
  label,
}: {
  orderId: string;
  label: string;
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const cancelResponse = await cancelOrder(orderId, cancellationReason);
      if (!cancelResponse.success) {
        toast({
          title: "No se pudo anular la venta",
          description: cancelResponse.message,
          variant: "destructive",
        });
        return;
      }

      setOpen(false);
      setCancellationReason("");
      toast({
        title: "Venta anulada",
        description: `La venta ${label} ha sido anulada`,
      });
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost_destructive"
          size="icon"
          aria-label={`Anular venta ${label}`}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Anular la venta {label}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            No se puede deshacer la cancelación de la venta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor={`cancellationReason-${orderId}`}>
            Motivo de la anulación
          </Label>
          <Textarea
            id={`cancellationReason-${orderId}`}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Escribe el motivo"
            rows={4}
            required
            disabled={isPending}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Regresar</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!cancellationReason.trim() || isPending}
            onClick={onConfirm}
          >
            {isPending ? "Anulando…" : "Anular venta"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelOrderButton;
