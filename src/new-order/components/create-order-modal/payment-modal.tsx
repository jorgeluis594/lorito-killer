"use client";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { formatPrice } from "@/lib/utils";
import {
  NonePayment,
  CashPayment,
  CardPayment,
  CombinedPayment,
  WalletPayment,
} from "./payment_views";
import { create, getCompany } from "@/order/actions";
import { useToast } from "@/shared/components/ui/use-toast";
import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";
import React, { useEffect, useState } from "react";
import { ReloadIcon } from "@radix-ui/react-icons";
import PdfVoucherRedirection from "@/order/components/pdf-voucher-redirection";
import { Order } from "@/order/types";
import { Company } from "@/company/types";
import type { Document } from "@/document/types";
import { useUserSession } from "@/lib/use-user-session";
import DiscountFields from "@/new-order/components/create-order-modal/discount-fields";

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
  const { getPaidAmount, reset, resetPayment, setDiscount } = useOrderFormActions();
  const { addOrder } = useCashShiftStore((state) => state);
  const PaymentView = PaymentViews[paymentMode];
  const { toast } = useToast();
  const [creatingOrder, setCreatingOrder] = useState(false);
  const user = useUserSession();

  const handleOrderCreation = async () => {
    if (!order.documentType) {
      toast({
        variant: "destructive",
        description: "Seleccione un tipo de documento",
      });
      return;
    }

    setCreatingOrder(true);
    const response = await create(user!.id, { ...order, status: "completed" });
    if (response.success) {
      toast({
        title: "En hora buena!",
        description: "Venta realizada con éxito, generando comprobante",
      });
      addOrder(response.data.order);
      reset();
      onOpenChange(false);
      window.open(`/api/orders/${response.data.order.id}/documents`, "_blank");
    } else {
      toast({
        variant: "destructive",
        description: response.message,
      });
    }
    setCreatingOrder(false);
  };

  const CreateOrderButton = ({
    amountIsInvalid,
  }: {
    amountIsInvalid: boolean;
    paidAmount: number;
    total: number;
  }) => {
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
          disabled={amountIsInvalid}
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
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setDiscount(undefined);
    }
    onOpenChange(isOpen);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
          <div className="text-center">
            {order.discount && (
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <div className="text-xl text-gray-600 text-right">
                    Subtotal:
                  </div>
                  <div className="text-lg text-red-500 text-right">
                    Descuento:
                  </div>
                </div>
                <div>
                  <div className="text-xl text-gray-600 text-left">
                    {formatPrice(order.netTotal)}
                  </div>
                  <div className="text-lg text-red-500 text-left">
                    {formatPrice(order.discountAmount)}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1 mt-3">
              <div className="text-3xl font-medium leading-none text-right">
                TOTAL:
              </div>
              <div className="text-3xl font-medium leading-none text-left">
                {formatPrice(order.total)}
              </div>
            </div>
          </div>
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
          <PaymentView/>
          {paymentMode !== "none" && (
            <DiscountFields defaultDiscount={order.discount}/>
          )}
        </div>
        <DialogFooter>
          <CreateOrderButton
            amountIsInvalid={getPaidAmount() !== order.total}
            paidAmount={getPaidAmount()}
            total={order.total}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
