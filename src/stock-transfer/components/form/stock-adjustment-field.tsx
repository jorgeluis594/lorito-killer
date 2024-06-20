import type { Adjustment } from "./types";
import ProductSelector from "@/product/components/form/product-selector";
import { Product, SingleProduct } from "@/product/types";
import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { plus } from "@/lib/utils";

interface StockAdjustmentFieldProps {
  adjustment: Adjustment;
  onChange: (adjustment: Adjustment) => void;
}

export default function StockAdjustmentField({
  adjustment,
  onChange,
}: StockAdjustmentFieldProps) {
  const [currentProduct, setCurrentProduct] = useState<
    SingleProduct | undefined
  >();
  const [type, setType] = useState<"INCREASE" | "DECREASE">(adjustment.type);
  const [quantity, setQuantity] = useState(adjustment.quantity);

  const onQuantityChange = (ev: any) => setQuantity(ev.target.value);

  const onTypeChange = (value: string) => {
    if (value !== type) setType(value as "INCREASE" | "DECREASE");
  };

  useEffect(() => {
    onChange({ ...adjustment, productId: currentProduct?.id, type, quantity });
  }, [currentProduct, type, quantity]);

  return (
    <div key={adjustment.id} className="grid grid-cols-12 gap-2 my-2">
      <div className="col-span-3">
        <ProductSelector
          value={currentProduct}
          onSelect={setCurrentProduct}
          productType="SingleProduct"
        />
      </div>
      <div className="col-span-2">
        <span>{currentProduct && currentProduct.stock}</span>
      </div>
      <div className="col-span-2">
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCREASE">Incremento</SelectItem>
            <SelectItem value="DECREASE">Decremento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Input value={quantity} onChange={onQuantityChange}></Input>
      </div>
      <div className="col-span-2">
        <span>{currentProduct && plus(quantity)(currentProduct.stock)}</span>
      </div>
    </div>
  );
}
