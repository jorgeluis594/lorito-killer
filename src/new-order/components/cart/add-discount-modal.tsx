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
import React, { useEffect, useState } from "react";
import { formatPrice, sub } from "@/lib/utils";
import { Separator } from "@/shared/components/ui/separator";

const validateDiscount = (discount: number, total: number) => {
  return discount > 0 && discount <= total;
};

export function AddDiscountModal({ orderItem }: { orderItem: OrderItem }) {
  const [discountAmount, setDiscountAmount] = useState<number | undefined>();
  const [isDiscountValid, setIsDiscountValid] = useState<boolean>(false);

  const onDiscountAmountChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const discount = parseFloat(ev.target.value);
    setDiscountAmount(discount);
    setIsDiscountValid(validateDiscount(discount, orderItem.total));
  };

  return (
    <Dialog>
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
        <div className="w-full">
          <div className="flex space-x-5">
            <div className="flex-none">
              <p className="text-gray-600">Subtotal:</p>
              <p className="text-red-500">Descuento:</p>
              <p>Total:</p>
            </div>
            <div className="flex-1">
              <p className="text-gray-600">{formatPrice(orderItem.total)}</p>
              <p className="text-red-500 -ml-3">
                - {formatPrice(discountAmount || 0)}
              </p>
              <p>{formatPrice(sub(orderItem.total)(discountAmount || 0))}</p>
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
          ></MoneyInput>
          <p className="text-sm text-foreground">
            (Máximo permitido: {formatPrice(orderItem.total)})
          </p>
        </div>
        <DialogFooter>
          <div className="flex sm:justify-start space-x-3">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar y mantener precio original
              </Button>
            </DialogClose>
            <Button type="button" disabled={!isDiscountValid}>
              Agregar descuento
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
