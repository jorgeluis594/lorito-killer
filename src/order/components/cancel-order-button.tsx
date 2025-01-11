"use client";

import { Order } from "@/order/types";
import { Document } from "@/document/types";
import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
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
import { correlative } from "@/document/utils";
import { cancelOrder } from "@/order/actions";
import { useToast } from "@/shared/components/ui/use-toast";
import {useState} from "react";
import {log} from "@/lib/log";
import {Textarea} from "@/shared/components/ui/textarea";
import {Label} from "@/shared/components/ui/label";

const CancelOrderButton = ({
  order,
  document,
}: {
  order: Order;
  document?: Document;
}) => {
  const { toast } = useToast();
  const [cancellationReason, setCancellationReason] = useState<string>('');

  const onClickHandle = async () => {
    if (!cancellationReason) {
      toast({
        title: "Error",
        description: "Debe proporcionar una razón para la cancelación.",
        variant: "destructive",
      });
      return;
    }


    const cancelResponse = await cancelOrder(order, cancellationReason);
    if (!cancelResponse.success) {
      toast({
        title: "Error",
        description: `No se pudo cancelar la venta. Comuniquese con soporte.`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Venta anulada con éxito",
      description: `La venta ${document ? correlative(document) : order.id} ha sido anulada`,
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <Button variant="destructive" size="icon">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro de cancelar la venta{" "}
            {document ? correlative(document) : order.id}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            No se puede deshacer la cancelación de la venta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="cancellationReason">Razón de la cancelación:</Label>
          <Textarea
            id="cancellationReason"
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Ingrese una razón"
            rows={4}
            style={{ width: '100%' }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>No, regresar</AlertDialogCancel>
          <AlertDialogAction onClick={onClickHandle}>
            Sí, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelOrderButton;
