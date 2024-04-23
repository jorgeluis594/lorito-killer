"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/components/forms/order-form/order-form-provider";
import { formatPrice } from "@/lib/utils";
import {
  NonePayment,
  CashPayment,
  CardPayment,
  CombinedPayment,
  WalletPayment,
} from "./payment_views";
import { create } from "@/order/actions";
import { useToast } from "@/components/ui/use-toast";
import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";
import React, { useState } from "react";
import { ReloadIcon } from "@radix-ui/react-icons";
import PdfVoucherRedirection from "@/order/components/pdf-voucher-redirection";
import { Order } from "@/order/types";

const PaymentViews = {
  none: NonePayment,
  cash: CashPayment,
  card: CardPayment,
  wallet: WalletPayment,
  combine: CombinedPayment,
};

interface CreateOrderModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const PaymentModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const { order, paymentMode } = useOrderFormStore((state) => state);
  const { getPaidAmount, reset, resetPayment } = useOrderFormActions();
  const { addOrder } = useCashShiftStore((state) => state);
  const PaymentView = PaymentViews[paymentMode];
  const { toast } = useToast();
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState<Order | null>(null);

  const handleOrderCreation = async () => {
    setCreatingOrder(true);
    const response = await create({ ...order, status: "completed" });
    if (response.success) {
      toast({
        title: "En hora buena!",
        description: "Venta realizada con éxito, generando comprobante",
      });
      addOrder(response.data);
      setOrderCreated(response.data);
    } else {
      toast({
        variant: "destructive",
        description:
          "Error al realizar la venta, comuniquese con nostros para solucionar el problema",
      });
    }
    setCreatingOrder(false);
  };

  const CreateOrderButton = ({ amountIsValid }: { amountIsValid: boolean }) => {
    if (creatingOrder) {
      return (
        <Button className="btn-success" type="button" disabled={true}>
          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
        </Button>
      );
    } else if (paymentMode !== "none") {
      return (
        <Button
          type="button"
          disabled={amountIsValid}
          onClick={handleOrderCreation}
        >
          Realiza pago
        </Button>
      );
    } else {
      return (
        <Button type="button" disabled={true}>
          Realiza pago
        </Button>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="md:max-w-4xl sm:max-w-3xl"
        onInteractOutside={(e) => {
          e.preventDefault(); // Prevents close modal when clicking outside of modal
        }}
      >
        <DialogHeader>
          <DialogTitle>Pagar pedido</DialogTitle>
        </DialogHeader>
        <div className="my-2 relative">
          <p className="text-2xl font-medium leading-none text-center">
            <span className="text-xl font-light mr-2">Total</span>
            {formatPrice(order.total)}
          </p>
          {paymentMode !== "none" && (
            <Button
              type="button"
              variant="link"
              onClick={resetPayment}
              className="absolute top-0 right-0 py-0"
            >
              CAMBIAR MÉTODO
            </Button>
          )}
          {orderCreated ? (
            <PdfVoucherRedirection
              order={orderCreated}
              onPdfCreated={() => {
                onOpenChange(false);
                reset();
                setOrderCreated(null);
              }}
            />
          ) : (
            <PaymentView />
          )}
        </div>
        <DialogFooter>
          <CreateOrderButton amountIsValid={getPaidAmount() !== order.total} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
