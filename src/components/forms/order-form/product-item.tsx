"use client";

import { Product } from "@/product/types";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import Image from "next/image";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/components/forms/order-form/order-form-provider";

export default function ProductItem({ product }: { product: Product }) {
  const photoUrl = product.photos![0]?.url || "";
  const orderItems = useOrderFormStore((state) => state.orderItems);
  const orderItem = orderItems.find((item) => item.product.id === product.id);
  const { addProduct } = useOrderFormActions();

  const onAddProductToCart = () => {
    addProduct(product);
  };

  return (
    <Card onClick={onAddProductToCart}>
      <CardContent className="px-4">
        <div className="mt-4 mx-auto relative w-[100px] h-[100px] rounded-md overflow-hidden">
          <Image fill className="object-cover" alt="Image" src={photoUrl} />
        </div>
        <p className="text-lg text-center font-light leading-none mt-8">
          {product.name}
        </p>
        <p className="text-lg text-center font-medium mt-2">
          {formatPrice(product.price)}
        </p>
      </CardContent>
    </Card>
  );
}
