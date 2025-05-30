import type { Adjustment } from "./types";
import ProductSelector from "@/product/components/form/product-selector";
import { SingleProduct } from "@/product/types";
import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { mul, plus } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Trash } from "lucide-react";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/shared/components/ui/tooltip";

interface StockAdjustmentFieldProps {
  adjustment: Adjustment;
  onChange: (adjustment: Adjustment) => void;
  onRemove: (adjustment: Adjustment) => void;
  skipProductIds?: string[];
}

export default function StockAdjustmentField({
  adjustment,
  onChange,
  onRemove,
  skipProductIds = [],
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

  const onRemoveClick = () => {
    onRemove(adjustment);
  };

  useEffect(() => {
    onChange({ ...adjustment, productId: currentProduct?.id, type, quantity });
  }, [currentProduct, type, quantity]);

  return (
    <div key={adjustment.id} className="grid grid-cols-12 gap-4 my-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="col-span-3 flex items-center truncate">
              <ProductSelector
                value={currentProduct}
                onSelect={setCurrentProduct}
                productType="SingleProduct"
                skipProductIds={skipProductIds}
              />
            </div>
          </TooltipTrigger>
          {currentProduct?.name && (
            <TooltipContent>
              <p>{currentProduct.name}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <div className="col-span-2 flex items-center">
        <span>{currentProduct && currentProduct.stock}</span>
      </div>
      <div className="col-span-2 flex items-center">
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
      <div className="col-span-2 flex items-center flex-wrap">
        <Input
          value={quantity}
          min={0}
          step={1}
          type="number"
          onChange={onQuantityChange}
          className="w-full"
        />
        {quantity <= 0 && (
          <p className="text-xs font-medium text-destructive">
            Debe ser mayor a 0
          </p>
        )}
      </div>
      <div className="col-span-2 flex items-center">
        <span>
          {currentProduct &&
            quantity > 0 &&
            plus(currentProduct.stock)(
              mul(quantity)(type === "INCREASE" ? 1 : -1),
            )}
        </span>
      </div>
      <div className="col-span-1 flex md:items-center justify-center">
        <Button
          variant="destructive"
          size="icon"
          type="button"
          onClick={onRemoveClick}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
