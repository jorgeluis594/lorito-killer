"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChefHat } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/use-toast";
import type { KitchenItem } from "../types";
import { takeOrderItemAction } from "../actions";

const statusLabel = {
  PENDING: "Pendiente",
  PREPARING: "En preparación",
  CANCELLED: "Cancelado",
} as const;

export function KitchenItems({ items }: { items: KitchenItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

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
      toast({ title: "Producto tomado por Cocina" });
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay productos activos para Cocina.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="flex items-center justify-between gap-4 rounded-lg border p-4"
        >
          <div className="flex min-w-0 flex-col gap-1">
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
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
