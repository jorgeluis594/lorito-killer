"use client";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { OrderItem } from "@/order/types";

import { MdOutlineDiscount } from "react-icons/md";
import { Label } from "@/shared/components/ui/label";
import { MoneyInput } from "@/shared/components/ui/input";
import React, { useState } from "react";
import { formatPrice, sub } from "@/lib/utils";
import { Separator } from "@/shared/components/ui/separator";
import { useOrderFormActions } from "@/new-order/order-form-provider";

const validateDiscount = (discount: number, netTotal: number) => {
  return discount > 0 && discount <= netTotal;
};

export function AddDiscountModal({ orderItem }: { orderItem: OrderItem }) {
  const { setItemDiscount } = useOrderFormActions();
  const [discountAmount, setDiscountAmount] = useState<number>(
    orderItem.discountAmount,
  );
  const [isDiscountValid, setIsDiscountValid] = useState<boolean>(false);
  const [open, setOpen] = useState(false);

  const onDiscountAmountChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const discount = parseFloat(ev.target.value);
    setDiscountAmount(discount);
    setIsDiscountValid(validateDiscount(discount, orderItem.netTotal));
  };

  const handleDiscountSubmit = () => {
    setItemDiscount(orderItem.id, { type: "amount", value: discountAmount! });
    setOpen(false);
  };

  const handleCancelButton = () => {
    setItemDiscount(orderItem.id, null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <MdOutlineDiscount className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Agregar descuento</DialogTitle>
          <DialogDescription>
            Producto: <strong>{orderItem.productName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="w-full mt-2">
          <div className="flex space-x-5">
            <div className="flex-none">
              <p className="text-gray-600">Subtotal:</p>
              <p className="text-red-500">Descuento:</p>
              <p>Total:</p>
            </div>
            <div className="flex-1">
              <p className="text-gray-600">{formatPrice(orderItem.netTotal)}</p>
              <p className="text-red-500 -ml-3">
                - {formatPrice(discountAmount || 0)}
              </p>
              <p>{formatPrice(sub(orderItem.netTotal)(discountAmount || 0))}</p>
            </div>
          </div>
        </div>
        <Separator className="my-2" />

        <div className="w-full mb-4">
          <Label htmlFor="discountAmount">Ingrese el descuento:</Label>
          <MoneyInput
            id="discountAmount"
            value={discountAmount}
            onChange={onDiscountAmountChange}
          />
          <p className="text-sm text-foreground">
            (Máximo permitido: {formatPrice(orderItem.netTotal)})
          </p>
        </div>

        <DialogFooter>
          <div className="flex flex-col sm:flex-row sm:justify-start space-y-2 sm:space-y-0 sm:space-x-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelButton}
              className="w-full sm:w-auto"
            >
              Cancelar y mantener precio original
            </Button>
            <Button
              type="button"
              disabled={!isDiscountValid}
              onClick={handleDiscountSubmit}
              className="w-full sm:w-auto"
            >
              Agregar descuento
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
