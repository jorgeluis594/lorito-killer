"use client";

import { KG_UNIT_TYPE, type Product, SingleProductType } from "@/product/types";
import { Card, CardContent } from "@/shared/components/ui/card";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { formatPrice } from "@/lib/utils";
import Image from "next/image";
import { useOrderFormActions } from "@/new-order/order-form-provider";
import { useState } from "react";
import KgCalculatorForm from "@/new-order/components/cart/kg-calculator-form";

export default function ProductItem({ product }: { product: Product }) {
  const photoUrl = product.photos![0]?.url || "";
  const [openKgCalculator, setOpenKgCalculator] = useState(false);
  const { addProduct } = useOrderFormActions();

  const onAddProductToCart = () => {
    if (
      product.type === SingleProductType &&
      product.unitType === KG_UNIT_TYPE
    ) {
      setOpenKgCalculator(true);
      return;
    }

    addProduct(product);
  };

  return (
    <>
      {openKgCalculator && (
        <KgCalculatorForm
          open={openKgCalculator}
          onOpenChange={setOpenKgCalculator}
          defaultValue={1}
          product={product}
          onChange={(val) => {
            console.log(val);
          }}
        />
      )}
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
          <p className="text-sm text-center mt-1">
            {product.type == SingleProductType
              ? `${product.stock} ${UNIT_TYPE_MAPPER[product.unitType]}`
              : "Paquete"}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
