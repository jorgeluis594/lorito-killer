"use client";

import { labelVariants } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { Separator } from "@/shared/components/ui/separator";
import type { Adjustment } from "./types";
import StockAdjustmentField from "@/stock-transfer/components/form/stock-adjustment-field";

interface StockAdjustmentFieldsProps {
  value: Adjustment[];
  onChange: (value: Adjustment[]) => void;
}

export default function StockAdjustmentFields({
  value,
  onChange,
}: StockAdjustmentFieldsProps) {
  const onAdjustmentAdd = () => {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        quantity: 1,
        type: "INCREASE",
      },
    ]);
  };

  const onAdjustmentChange = (adjustment: Adjustment) => {
    onChange(value.map((a) => (a.id === adjustment.id ? adjustment : a)));
  };

  const onAdjustmentRemove = (adjustment: Adjustment) => {
    onChange(value.filter((a) => a.id !== adjustment.id));
  };

  return (
    <div className="overflow-y-auto w-screen md:w-full">
      <div className="min-w-max">
        <div className="grid grid-cols-12 gap-2 bg-accent p-3">
          <div className="col-span-3">
            <span className={labelVariants()}>Producto</span>
          </div>
          <div className="col-span-2">
            <span className={labelVariants()}>Cantidad actual</span>
          </div>
          <div className="col-span-2">
            <span className={labelVariants()}>Tipo de ajuste </span>
          </div>
          <div className="col-span-2">
            <span className={labelVariants()}>Cantidad</span>
          </div>
          <div className="col-span-2">
            <span className={labelVariants()}>Cantidad final</span>
          </div>
          <div>
          </div>
        </div>
        {value.map((adjustment, idx) => (
          <div key={adjustment.id}>
            {idx > 0 && <Separator/>}
            <StockAdjustmentField
              adjustment={adjustment}
              onChange={onAdjustmentChange}
              onRemove={onAdjustmentRemove}
              skipProductIds={value
                .filter((a) => a.productId)
                .map((a) => a.productId!)}
            />
          </div>
        ))}
        <Button
          variant="outline"
          type="button"
          className="mt-3"
          onClick={onAdjustmentAdd}
        >
          <Plus className="h-4 w-4 mr-2"/>
          Agregar item
        </Button>
      </div>
    </div>
  );
}
