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

interface ProductItemsSelectorProps {
  value: ProductItem[];
  onChange: (value: ProductItem[]) => void;
}

export default function ProductItemsSelector({
  value,
  onChange,
}: ProductItemsSelectorProps) {
  const singleProducts = useSingleProducts();

  const addProduct = () => {
    onChange([
      ...value,
      { id: crypto.randomUUID(), quantity: 1, productId: "", productName: "" },
    ]);
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
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8">
            <Select>
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
            <Input placeholder="Cantidad" type="number" required />
          </div>
          <div className="col-span-1">
            <Button variant="destructive" size="icon">
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
