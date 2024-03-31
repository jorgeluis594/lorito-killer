"use client";

import { Product } from "@/product/types";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { useOrderFormActions } from "@/components/forms/order-form/order-form-provider";

export default function ProductItem({ product }: { product: Product }) {
  const photoUrl = product.photos![0]?.url || "";
  const { addProduct } = useOrderFormActions();

  const onAddProductToCart = () => {
    addProduct(product);
  };

  return (
    <Card onClick={onAddProductToCart}>
      <CardContent className="px-4">
        <div className="mt-2 mx-auto relative w-[100px] h-[100px] rounded-md overflow-hidden">
          <Image fill className="object-cover" alt="Image" src={photoUrl} />
        </div>
        <p className="text-sm text-center font-light leading-none mt-5">
          {product.name}
        </p>
        <p className="text-lg text-center font-semibold mt-4">
          {product.price}
        </p>
      </CardContent>
    </Card>
  );
}
