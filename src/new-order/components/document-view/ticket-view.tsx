"use client";

import {useOrderFormActions, useOrderFormStore} from "@/new-order/order-form-provider";
import {useCashShiftStore} from "@/cash-shift/components/cash-shift-store-provider";
import {useEffect, useState} from "react";
import {Button} from "@/shared/components/ui/button";
import CustomerSelector from "@/customer/components/customer-selector";
import NewCustomerModal from "@/customer/components/new-customer-modal";
import {ScrollArea} from "@/shared/components/ui/scroll-area";
import CartItem from "@/new-order/components/cart/cart-item";
import {formatPrice} from "@/lib/utils";
import PaymentModal from "@/new-order/components/create-order-modal/payment-modal";

export default function TicketView() {
  const order = useOrderFormStore((state) => state.order);
  const cashShift = useCashShiftStore((state) => state.cashShift);
  const customer = useOrderFormStore((state) => state.order.customer);

  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const { increaseQuantity, decreaseQuantity, reset, removeOrderItem, setCustomer } = useOrderFormActions();

  return (
    <>
      <div className="h-full grid grid-rows-[min-content_min-content_1fr_min-content]">
        <div className="p-5 border-b flex justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Nota de Venta</h2>
          <Button
            variant="ghost_destructive"
            type="button"
            size="sm"
            onClick={() => reset()}
          >
            Vaciar carrito
          </Button>
        </div>

        <div className="p-5 border-b flex justify-between items-center space-x-4">
          <div className="flex items-center justify-end">
            <h2 className="mr-4">Cliente:</h2>
            <CustomerSelector
              value={customer}
              onSelect={(customer) => {
                setCustomer(customer);
              }}
            />
          </div>
          <div>
            <NewCustomerModal/>
          </div>
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
