"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import ProductsSearcher from "@/new-order/components/products-view/products-searcher";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { confirmFulfillmentRound } from "@/order/rounds/fulfillment-actions";
import { Button } from "@/shared/components/ui/button";
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

export default function FulfillmentOrder({
  initialOrderId,
  initialOrderType = "TAKE_AWAY",
}: {
  initialOrderId?: string;
  initialOrderType?: "TAKE_AWAY" | "DELIVERY";
}) {
  const order = useOrderFormStore((state) => state.order);
  const {
    reset,
    removeOrderItem,
    increaseQuantity,
    decreaseQuantity,
    updateOrderItem,
  } = useOrderFormActions();
  const [orderType, setOrderType] = useState<"TAKE_AWAY" | "DELIVERY">(
    initialOrderType,
  );
  const [orderId, setOrderId] = useState<string | undefined>(initialOrderId);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function submit() {
    setSubmitting(true);
    const response = await confirmFulfillmentRound({
      orderId,
      orderType,
      roundId: crypto.randomUUID(),
      items: order.orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    });
    setSubmitting(false);
    if (!response.success) {
      toast({ variant: "destructive", description: response.message });
      return;
    }
    setOrderId(response.data.orderId);
    reset();
    toast({
      title:
        response.data.number === 1
          ? "Pedido confirmado"
          : "Adicionales enviados",
      description: `Ronda ${response.data.number} enviada a ${response.data.printJobIds.length} impresora(s).`,
    });
    if (!orderId) router.push(`/dashboard/orders/${response.data.orderId}`);
  }

  return (
    <div className="mx-auto grid h-[calc(100dvh-3.5rem)] max-w-[1600px] gap-6 overflow-hidden p-4 lg:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)]">
      <section className="flex min-h-0 flex-col rounded-xl border bg-card">
        <header className="space-y-3 border-b p-4">
          <div>
            <h1 className="text-xl font-bold">Pedido para preparar</h1>
            <p className="text-sm text-muted-foreground">
              Confirma ahora; el cobro puede hacerse después.
            </p>
          </div>
          <Select
            value={orderType}
            onValueChange={(value) => setOrderType(value as typeof orderType)}
            disabled={Boolean(orderId)}
          >
            <SelectTrigger aria-label="Tipo de pedido">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TAKE_AWAY">Para llevar</SelectItem>
              <SelectItem value="DELIVERY">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {order.orderItems.length ? (
            <ul className="space-y-3">
              {order.orderItems.map((item) => (
                <li key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 font-medium">
                      {item.productName}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Quitar uno de ${item.productName}`}
                      onClick={() => decreaseQuantity(item.id)}
                    >
                      <Minus />
                    </Button>
                    <span className="w-10 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Agregar uno de ${item.productName}`}
                      onClick={() => increaseQuantity(item.id)}
                    >
                      <Plus />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Eliminar ${item.productName}`}
                      onClick={() => removeOrderItem(item.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <Input
                    className="mt-2"
                    aria-label={`Observaciones de ${item.productName}`}
                    placeholder="Observaciones de preparación"
                    value={item.notes ?? ""}
                    onChange={(event) =>
                      updateOrderItem({ ...item, notes: event.target.value })
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Agrega los productos de esta ronda.
            </p>
          )}
        </div>
        <footer className="border-t p-4">
          <div className="mb-3 flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!order.orderItems.length || submitting}
            onClick={() => void submit()}
          >
            {submitting
              ? "Confirmando…"
              : orderId
                ? "Enviar adicionales"
                : "Confirmar sin cobrar"}
            {!submitting && <ArrowRight data-icon="inline-end" />}
          </Button>
        </footer>
      </section>
      <div className="min-h-0 overflow-hidden rounded-xl border bg-card p-3">
        <ProductsSearcher />
      </div>
    </div>
  );
}
