"use client";

import CartItem from "@/components/forms/order-form/cart-item";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/components/forms/order-form/order-form-provider";
import { Button } from "@/components/ui/button";
import { create } from "@/order/actions";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";

export default function Cart() {
  const order = useOrderFormStore((state) => state);
  const { increaseQuantity, decreaseQuantity, reset } = useOrderFormActions();

  const { toast } = useToast();

  const handleOrderCreation = async () => {
    const response = await create(order);
    if (response.success) {
      reset();
      toast({ description: "Venta realizada con éxito" });
    } else {
      toast({ description: "Error al realizar la venta" });
    }
  };

  return (
    <div className="h-full border-l grid grid-rows-[auto,1fr,auto]">
      <div className="p-5 border-b">
        <h2 className="text-xl font-semibold tracking-tight">Pedido</h2>
      </div>
      <div className="py-3 border-b">
        {order.orderItems.map((item) => (
          <CartItem
            key={item.product.id}
            item={item}
            increaseQuantity={increaseQuantity}
            decreaseQuantity={decreaseQuantity}
          />
        ))}
      </div>
      <div className="p-5">
        <Button className="w-full" onClick={handleOrderCreation}>
          <div className="flex justify-between w-full">
            <p className="text-end text-xl font-bold">Vender!</p>
            <p className="text-end text-xl font-bold">
              Total: {formatPrice(order.total)}
            </p>
          </div>
        </Button>
      </div>
    </div>
  );
}
