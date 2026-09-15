"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  cancelFulfillment,
  deliverDelivery,
  deliverTakeAway,
  dispatchDelivery,
} from "../actions";
import FulfillmentPaymentButton from "@/order/components/fulfillment-payment-button";
import { Badge } from "@/shared/components/ui/badge";

export default function DeliveryActions({
  orderId,
  orderType,
  paymentStatus,
  orderVersion,
  total,
  cashShiftId,
  delivery,
}: {
  orderId: string;
  orderType: "TAKE_AWAY" | "DELIVERY";
  paymentStatus: "pending" | "paid";
  orderVersion: string;
  total: number;
  cashShiftId?: string;
  delivery?: {
    status: "PENDING" | "DISPATCHED" | "DELIVERED";
    dispatchedAt: Date | null;
    deliveredAt: Date | null;
    dispatchedBy: { name: string | null } | null;
    deliveredBy: { name: string | null } | null;
  } | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const run = (
    action: (input: {
      orderId: string;
    }) => Promise<{ success: boolean; message?: string }>,
  ) =>
    startTransition(async () => {
      const result = await action({ orderId });
      toast({
        variant: result.success ? "default" : "destructive",
        description: result.success ? "Pedido actualizado." : result.message,
      });
      if (result.success) router.refresh();
    });

  return (
    <div className="space-y-3">
      {delivery && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">
            {delivery.status === "PENDING"
              ? "Pendiente"
              : delivery.status === "DISPATCHED"
                ? "Despachado"
                : "Entregado"}
          </Badge>
          {delivery.dispatchedAt && (
            <span>
              Despachado por {delivery.dispatchedBy?.name ?? "usuario"} ·{" "}
              {delivery.dispatchedAt.toLocaleString("es-PE")}
            </span>
          )}
          {delivery.deliveredAt && (
            <span>
              Entregado por {delivery.deliveredBy?.name ?? "usuario"} ·{" "}
              {delivery.deliveredAt.toLocaleString("es-PE")}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {paymentStatus === "pending" && (
          <>
            <Button asChild variant="outline">
              <a
                href={`/dashboard/orders/fulfillment?orderId=${orderId}&type=${orderType}`}
              >
                Enviar adicionales
              </a>
            </Button>
            <FulfillmentPaymentButton
              orderId={orderId}
              orderVersion={orderVersion}
              total={total}
              cashShiftId={cashShiftId}
            />
          </>
        )}
        {orderType === "DELIVERY" && delivery?.status !== "DELIVERED" && (
          <>
            {delivery?.status === "PENDING" && (
              <Button disabled={pending} onClick={() => run(dispatchDelivery)}>
                Registrar despacho
              </Button>
            )}
            <Button
              disabled={
                pending ||
                paymentStatus !== "paid" ||
                delivery?.status !== "DISPATCHED"
              }
              onClick={() => run(deliverDelivery)}
            >
              Confirmar entrega
            </Button>
          </>
        )}
        {orderType === "TAKE_AWAY" && paymentStatus === "paid" && (
          <Button disabled={pending} onClick={() => run(deliverTakeAway)}>
            Registrar entrega
          </Button>
        )}
        <Button
          disabled={
            pending ||
            paymentStatus !== "pending" ||
            delivery?.status === "DELIVERED"
          }
          variant="destructive"
          onClick={() => run(cancelFulfillment)}
        >
          Cancelar pedido
        </Button>
      </div>
    </div>
  );
}
