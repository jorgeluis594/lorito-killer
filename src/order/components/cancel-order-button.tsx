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

const CancelOrderButton = ({
  order,
  document,
}: {
  order: Order;
  document?: Document;
}) => {
  const { toast } = useToast();
  const onClickHandle = async () => {
    const cancelResponse = await cancelOrder(order);
    if (!cancelResponse.success) {
      toast({
        title: "Error",
        description: `No se pudo cancelar la venta: ${cancelResponse.message}`,
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
            ¿Estas seguro de cancelar la venta{" "}
            {document ? correlative(document) : order.id}
          </AlertDialogTitle>
          <AlertDialogDescription>
            No se puede deshacer la cancelación de la venta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, regresar</AlertDialogCancel>
          <AlertDialogAction onClick={onClickHandle}>
            Si, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelOrderButton;
