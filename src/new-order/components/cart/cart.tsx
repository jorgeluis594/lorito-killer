"use client";

import type { DocumentType } from "@/document/types";

import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { Button } from "@/shared/components/ui/button";
import CustomerSelector from "@/customer/components/customer-selector";
import NewCustomerModal from "@/customer/components/new-customer-modal";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import PaymentModal from "@/new-order/components/create-order-modal/payment-modal";
import { useProductFormActions } from "@/new-order/components/products-view/product-searcher-form-provider";
import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import { toast } from "@/shared/components/ui/use-toast";
import { useCompany } from "@/lib/use-company";
import CartItem from "@/new-order/components/cart/cart-item";

export default function Cart() {
  const order = useOrderFormStore((state) => state.order);
  const { setDocumentType } = useOrderFormActions();
  const company = useCompany();

  const cashShift = useCashShift();
  const customer = useOrderFormStore((state) => state.order.customer);

  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const {
    increaseQuantity,
    decreaseQuantity,
    reset,
    removeOrderItem,
    setCustomer,
  } = useOrderFormActions();

  const handleClickSell = () => {
    if (order.documentType === "invoice" && order.customer !== undefined) {
      setOpenPaymentModal(true);
    } else if (
      order.documentType === "receipt" ||
      order.documentType === "ticket"
    ) {
      setOpenPaymentModal(true);
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Se necesita elegir un cliente",
      });
    }
  };

  const {
    increaseQuantityProduct,
    decreaseQuantityProduct,
    restoreStockProduct,
  } = useProductFormActions();

  return (
    <>
      <div className="h-full md:border-l grid grid-rows-[min-content_min-content_min-content_1fr_min-content]">
        <Tabs
          value={order.documentType}
          onValueChange={(value) => setDocumentType(value as DocumentType)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ticket">Nota de Venta</TabsTrigger>
            <TabsTrigger value="receipt" disabled={!company.isBillingActivated}>
              Boleta
            </TabsTrigger>
            <TabsTrigger value="invoice" disabled={!company.isBillingActivated}>
              Factura
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="p-5 border-b flex justify-between">
          {order.documentType === "ticket" ? (
            <h2 className="text-xl font-semibold tracking-tight">Pedido</h2>
          ) : order.documentType === "receipt" ? (
            <h2 className="text-xl font-semibold tracking-tight">Boleta</h2>
          ) : (
            <h2 className="text-xl font-semibold tracking-tight">Factura</h2>
          )}

          <Button
            variant="ghost_destructive"
            type="button"
            size="sm"
            onClick={() => reset()}
          >
            Vaciar carrito
          </Button>
        </div>

        <div className="p-5 border-b flex items-center space-x-4 w-full">
          <div className="flex items-center justify-end w-full">
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
                  increaseQuantityProduct={increaseQuantityProduct}
                  decreaseQuantityProduct={decreaseQuantityProduct}
                  removeOrderItem={removeOrderItem}
                  restoreStockProduct={restoreStockProduct}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
        <div className="p-5">
          <Button
            className="w-full"
            onClick={handleClickSell}
            disabled={!cashShift || order.orderItems.length === 0}
          >
            <div className="flex justify-between w-full">
              <p className="text-end text-xl font-bold">Vender!</p>
              <p className="text-end text-xl font-bold">
                Total: {formatPrice(order.netTotal)}
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
