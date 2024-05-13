"use client";

import { useSingleProducts } from "@/product/components/products-store-provider";
import { ProductItem } from "@/product/types";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Plus, Trash } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/use-toast";

interface ProductItemsSelectorProps {
  value: ProductItem[];
  onChange: (value: ProductItem[]) => void;
}

export default function ProductItemsSelector({
  value,
  onChange,
}: ProductItemsSelectorProps) {
  const singleProducts = useSingleProducts();
  const { toast } = useToast();

  const addProduct = () => {
    onChange([
      ...value,
      { id: crypto.randomUUID(), quantity: 1, productId: "", productName: "" },
    ]);
  };

  const onProductChange = (productItemId: string, productId: string) => {
    const updatedValue = value.map((productItem) => {
      if (productItem.id !== productItemId) return productItem;

      const product = singleProducts.find(
        (product) => product.id === productId,
      );

      if (!product) {
        toast({
          title: "Error",
          variant: "destructive",
          description: "No se encontró el producto",
        });
        return productItem;
      }

      return { ...productItem, productId, productName: product.name };
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
              <Select
                onValueChange={(productId) =>
                  onProductChange(productItem.id, productId)
                }
                value={productItem.productId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escoja un producto" />
                </SelectTrigger>
                <SelectContent>
                  {singleProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id!}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
