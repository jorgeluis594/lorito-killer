"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrderFormStore } from "@/components/forms/order-form/order-form-provider";
import { formatPrice } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface CreateOrderModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const PaymentModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const { ...order } = useOrderFormStore((state) => state);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="md:max-w-4xl sm:max-w-3xl"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Pagar pedido</DialogTitle>
        </DialogHeader>
        <div className="my-2">
          <p className="text-2xl font-medium leading-none text-center">
            <span className="text-xl font-light">Total</span>
            {formatPrice(order.total)}
          </p>
          <Separator className="mt-4" />
        </div>
        <DialogFooter>
          <Button type="submit">Realiza pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
