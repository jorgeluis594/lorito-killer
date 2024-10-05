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
  const [company, setCompany] = useState<Company | null>(null);
  const { addOrder } = useCashShiftStore((state) => state);
  const PaymentView = PaymentViews[paymentMode];
  const { toast } = useToast();
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState<Order | null>(null);
  const [createdDocument, setCreatedDocument] = useState<Document | null>(null);
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
      setOrderCreated(response.data.order);
      setCreatedDocument(response.data.document);
    } else {
      toast({
        variant: "destructive",
        description: response.message,
      });
    }
    setCreatingOrder(false);
  };

  useEffect(() => {
    getCompany().then((response) => {
      if (response.success) {
        setCompany(response.data);
      } else {
        toast({
          variant: "destructive",
          description:
            "Error al cargar la información de la empresa, comuniquese con nostros para solucionar el problema",
        });
      }
    });
  }, []);

  const CreateOrderButton = ({
    amountIsInvalid,
    paidAmount,
    total,
  }: {
    amountIsInvalid: boolean;
    paidAmount: number;
    total: number;
  }) => {
    useEffect(() => {
      console.log({ amountIsInvalid, paidAmount, total });
    }, []);
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
            {formatPrice(order.netTotal)}
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
          {orderCreated && createdDocument ? (
            <PdfVoucherRedirection
              order={orderCreated}
              document={createdDocument}
              company={company!}
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
          <CreateOrderButton
            amountIsInvalid={getPaidAmount() !== order.netTotal}
            paidAmount={getPaidAmount()}
            total={order.netTotal}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
