"use client";

import {
  Dialog,
  DialogContent,
  DialogTrigger
} from "@/shared/components/ui/dialog";
import {Button} from "@/shared/components/ui/button";
import {Plus, } from "lucide-react";
import Cart from "@/new-order/components/cart/cart";
import React from "react";

export default function CartMobile() {

  return (
    <Dialog >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-3/4 max-w-xs justify-center">
          Mostrar Carrito
        </Button>
      </DialogTrigger>
      <DialogContent variant="right" className="flex flex-col max-w-[35rem]">
        <Cart />
      </DialogContent>
    </Dialog>
  );
}
