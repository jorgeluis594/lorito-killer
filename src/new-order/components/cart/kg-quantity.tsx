"use client";

import KgCalculatorForm from "@/new-order/components/cart/kg-calculator-form";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { Button } from "@/shared/components/ui/button";
import { Pencil } from "lucide-react";
import { OrderItem } from "@/order/types";
import { useState } from "react";
import { mul } from "@/lib/utils";
import { useOrderFormActions } from "@/new-order/order-form-provider";

interface KgQuantityProps {
  orderItem: OrderItem;
}

const KgQuantity: React.FC<KgQuantityProps> = ({ orderItem }) => {
  const [open, setOpen] = useState(false);
  const { updateOrderItem } = useOrderFormActions();

  const onKgCalculatorSubmit = (kg: number) => {
    updateOrderItem({
      ...orderItem,
      quantity: kg,
      total: mul(kg)(orderItem.productPrice), // Refactor this, there is a lot of places where this is repeated
    });
    setOpen(false);
  };

  return (
    <>
      <KgCalculatorForm
        open={open}
        onOpenChange={setOpen}
        defaultValue={orderItem.quantity}
        productPrice={orderItem.productPrice}
        onSubmit={onKgCalculatorSubmit}
      />
      <div className="flex justify-center items-center">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          aria-label={`Editar peso de ${orderItem.productName}`}
          className="gap-2"
        >
          {orderItem.quantity} {UNIT_TYPE_MAPPER[orderItem.unitType]}
          <Pencil data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </>
  );
};

export default KgQuantity;
