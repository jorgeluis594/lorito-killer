"use client";

import { ProductItem, SingleProduct } from "@/product/types";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Plus, Trash } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/use-toast";
import ProductSelector from "@/product/components/form/product-selector";
import { useState } from "react";

interface ProductItemsSelectorProps {
  value: ProductItem[];
  onChange: (value: ProductItem[]) => void;
}

export default function ProductItemsSelector({
  value,
  onChange,
}: ProductItemsSelectorProps) {
  const { toast } = useToast();

  const addProduct = () => {
    onChange([
      ...value,
      { id: crypto.randomUUID(), quantity: 1, productId: "", productName: "" },
    ]);
  };

  const onProductChange = (newProductItem: ProductItem) => {
    const updatedValue = value.map((productItem) => {
      if (productItem.id !== newProductItem.id) return productItem;

      return newProductItem;
    });

    onChange(updatedValue);
  };

  const onQuantityChange = (productItemId: string, quantity: number) => {
    const updatedValue = value.map((productItem) => {
      if (productItem.id !== productItemId) return productItem;
      return { ...productItem, quantity };
    });

    onChange(updatedValue);
  };

  const removeProductItem = (productItemId: string) => {
    onChange(value.filter((productItem) => productItem.id !== productItemId));
  };

  return (
    <>
      <div className="flex items-center">
        <Label className="mr-4">Productos del pack</Label>
        <Button type="button" size="xs" onClick={addProduct}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-20 ">
        {value.map((productItem) => (
          <div key={productItem.id} className="grid grid-cols-12 gap-4 mb-2">
            <div className="col-span-8">
              <ProductItemSelectorField
                productItem={productItem}
                onChange={onProductChange}
              />
            </div>
            <div className="col-span-3">
              <Input
                placeholder="Cantidad"
                type="number"
                value={productItem.quantity}
                required
                onChange={(e) =>
                  onQuantityChange(productItem.id, parseInt(e.target.value))
                }
              />
            </div>
            <div className="col-span-1">
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeProductItem(productItem.id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ProductItemSelectorField({
  productItem,
  onChange,
}: {
  productItem: ProductItem;
  onChange: (value: ProductItem) => void;
}) {
  const [currentProduct, setCurrentProduct] = useState<
    SingleProduct | undefined
  >();

  return (
    <ProductSelector
      productType="SingleProduct"
      value={currentProduct}
      onSelect={(product) => {
        setCurrentProduct(product);
        onChange({
          ...productItem,
          productId: product.id!,
          productName: product.name,
        });
      }}
    />
  );
}
