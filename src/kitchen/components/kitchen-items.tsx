"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChefHat } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/use-toast";
import type { KitchenItem } from "../types";
import { markOrderItemReadyAction, takeOrderItemAction } from "../actions";
import { useRealtime } from "@/lib/realtime/hooks/use-realtime";

const statusLabel = {
  PENDING: "Pendiente",
  PREPARING: "En preparación",
  READY: "Listo",
  SERVED: "Servido",
  CANCELLED: "Cancelado",
} as const;

export function KitchenItems({ items }: { items: KitchenItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const realtime = useRealtime<{
    "order-item-taken": { orderItemId: string };
    "kitchen-item-ready": { orderItemId: string };
    "table-round-added": { tableId: string };
    "order-item-cancelled": { orderItemId: string };
    "kitchen-ticket-served": { tableId: string; round: number };
  }>("tables");

  useEffect(() => {
    const refresh = () => router.refresh();
    const unsubscribes = [
      realtime.on("table-round-added", refresh),
      realtime.on("order-item-taken", refresh),
      realtime.on("kitchen-item-ready", refresh),
      realtime.on("order-item-cancelled", refresh),
      realtime.on("kitchen-ticket-served", refresh),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [realtime, router]);

  const takeItem = (itemId: string) => {
    startTransition(async () => {
      const result = await takeOrderItemAction(itemId);
      if (!result.success) {
        toast({
          title: "No se pudo tomar el producto",
          description: result.message,
          variant: "destructive",
        });
        router.refresh();
        return;
      }
      toast({ title: "Producto en preparación" });
      router.refresh();
    });
  };

  const markReady = (itemId: string) => {
    startTransition(async () => {
      const result = await markOrderItemReadyAction(itemId);
      if (!result.success) {
        toast({
          title: "No se pudo marcar listo",
          description: result.message,
          variant: "destructive",
        });
        router.refresh();
        return;
      }
      toast({ title: "Producto listo" });
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay productos activos en esta estación.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              {item.preparationStation === "KITCHEN" ? "Cocina" : item.preparationStation === "BAR" ? "Barra" : "Sin configurar"}
            </p>
            <p className="font-medium break-words">
              Mesa {item.tableLabel} · Ronda {item.round}
            </p>
            <p className="break-words">
              {item.quantity} × {item.productName}
            </p>
            {item.notes ? (
              <p className="text-sm text-muted-foreground">{item.notes}</p>
            ) : null}
            {item.cancellationReason ? (
              <p className="text-sm text-muted-foreground">
                Motivo: {item.cancellationReason}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge
              variant={
                item.status === "CANCELLED" ? "destructive" : "secondary"
              }
            >
              {statusLabel[item.status]}
            </Badge>
            {item.status === "PENDING" ? (
              <Button onClick={() => takeItem(item.id)} disabled={pending}>
                <ChefHat data-icon="inline-start" />
                Tomar producto
              </Button>
            ) : item.status === "PREPARING" ? (
              <Button onClick={() => markReady(item.id)} disabled={pending}>
                <Check data-icon="inline-start" />
                Marcar listo
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
