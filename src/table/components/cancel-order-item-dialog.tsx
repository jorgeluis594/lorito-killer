"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
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
import { cancelOrderItemAction } from "../actions";

export function CancelOrderItemDialog({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const cancelItem = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;

    setPending(true);
    const result = await cancelOrderItemAction(itemId, trimmedReason);
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
            Solo puede cancelarse mientras Cocina no haya comenzado a
            prepararlo.
          </AlertDialogDescription>
        </AlertDialogHeader>
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
            disabled={pending || !reason.trim()}
          >
            Confirmar cancelación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
