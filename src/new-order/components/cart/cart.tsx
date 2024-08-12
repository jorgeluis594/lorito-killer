"use client";

import CartItem from "@/new-order/components/cart/cart-item";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { Button } from "@/shared/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import PaymentModal from "@/new-order/components/create-order-modal/payment-modal";
import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";

export default function Cart() {
  const order = useOrderFormStore((state) => state.order);
  const cashShift = useCashShiftStore((state) => state.cashShift);

  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const { increaseQuantity, decreaseQuantity, reset, removeOrderItem } =
    useOrderFormActions();

  useEffect(() => {
    reset();
  }, []);

  return (
    <>
      <div className="h-full border-l grid grid-rows-[min-content_1fr_min-content]">
        <div className="p-5 border-b flex justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Pedido</h2>
          <Button
            variant="ghost_destructive"
            type="button"
            size="sm"
            onClick={() => reset()}
          >
            Vaciar carrito
          </Button>
        </div>
        <ScrollArea className="border-b">
          <div className="py-3 h-full">
            <div>
              {order.orderItems.map((item) => (
                <CartItem
                  key={item.productId}
                  item={item}
                  increaseQuantity={increaseQuantity}
                  decreaseQuantity={decreaseQuantity}
                  removeOrderItem={removeOrderItem}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
        <div className="p-5">
          <Button
            className="w-full"
            onClick={() => setOpenPaymentModal(true)}
            disabled={!cashShift || order.orderItems.length === 0}
          >
            <div className="flex justify-between w-full">
              <p className="text-end text-xl font-bold">Vender!</p>
              <p className="text-end text-xl font-bold">
                Total: {formatPrice(order.total)}
              </p>
            </div>
          </Button>
        </div>
      </div>
      <PaymentModal
        isOpen={openPaymentModal}
        onOpenChange={(open) => setOpenPaymentModal(open)}
      />
    </>
  );
}
