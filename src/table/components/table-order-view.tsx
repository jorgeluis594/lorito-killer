"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Plus, Minus, Send } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import type { TableWithSession } from "../types";
import { addRoundAction } from "../actions";

type CartItem = {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  notes?: string;
};

interface TableOrderViewProps {
  table: TableWithSession;
}

export function TableOrderView({ table }: TableOrderViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const session = table.activeSession;

  // Get existing order items from session
  const existingItems: any[] = (session?.order as any)?.orderItems || [];
  const rounds = existingItems.reduce((acc: Record<number, any[]>, item: any) => {
    const round = item.round || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(item);
    return acc;
  }, {});

  const orderTotal = existingItems.reduce(
    (sum: number, item: any) => sum + (item.total?.toNumber?.() ?? item.total ?? 0),
    0,
  );
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.productPrice * item.quantity,
    0,
  );

  const addToCart = (product: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleSendRound = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    const result = await addRoundAction(
      table.id,
      cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        productPrice: item.productPrice,
        notes: item.notes,
      })),
    );
    setLoading(false);
    if (result.success) {
      toast({ title: `Ronda ${result.data.round} enviada` });
      setCart([]);
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing rounds */}
      {Object.keys(rounds).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Pedido actual</h3>
          {Object.entries(rounds)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([round, items]) => (
              <div key={round} className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Ronda {round}
                </p>
                <div className="space-y-1">
                  {items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.product?.name || "Producto"} x
                        {item.quantity?.toNumber?.() ?? item.quantity}
                      </span>
                      <span className="text-muted-foreground">
                        S/ {(item.total?.toNumber?.() ?? item.total ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          <div className="text-right font-semibold">
            Total: S/ {orderTotal.toFixed(2)}
          </div>
        </div>
      )}

      {/* New round cart */}
      {session?.status === "OPEN" && (
        <div className="space-y-3">
          <h3 className="font-semibold">Nueva ronda</h3>
          <p className="text-xs text-muted-foreground">
            Busca productos por nombre desde la pagina de Nueva Venta o agrega items manualmente.
          </p>

          {cart.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between"
                >
                  <div className="text-sm">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-muted-foreground">
                      S/ {item.productPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.productId, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.productId, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Subtotal ronda</span>
                <span className="font-medium">
                  S/ {cartTotal.toFixed(2)}
                </span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleSendRound}
                disabled={loading}
              >
                <Send className="h-4 w-4" />
                Enviar ronda
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
