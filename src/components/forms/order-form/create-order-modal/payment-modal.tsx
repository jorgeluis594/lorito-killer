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

  const handleOrderCreation = async () => {
    const response = await create({ ...order, status: "completed" });
    if (response.success) {
      reset();
      toast({
        title: "En hora buena!",
        description: "Venta realizada con éxito",
      });
      addOrder(response.data);
    } else {
      toast({
        variant: "destructive",
        description:
          "Error al realizar la venta, comuniquese con nostros para solucionar el problema",
      });
    }
    onOpenChange(false);
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
          <PaymentView />
        </div>
        <DialogFooter>
          {paymentMode !== "none" && (
            <Button
              type="button"
              disabled={getPaidAmount() !== order.total}
              onClick={handleOrderCreation}
            >
              Realiza pago
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
