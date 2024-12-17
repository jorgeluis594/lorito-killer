"use client";

import { KG_UNIT_TYPE, type Product, SingleProductType } from "@/product/types";
import { Card, CardContent } from "@/shared/components/ui/card";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { formatPrice, mul } from "@/lib/utils";
import Image from "next/image";
import { useOrderFormActions } from "@/new-order/order-form-provider";
import { useState } from "react";
import KgCalculatorForm from "@/new-order/components/cart/kg-calculator-form";
import { useProductFormActions } from "@/new-order/components/products-view/product-searcher-form-provider";
import {DescriptionProduct} from "@/new-order/components/products-view/description-product-item";

export default function ProductItem({ product }: { product: Product }) {
  const photoUrl = product.photos![0]?.url || "";
  const [openKgCalculator, setOpenKgCalculator] = useState(false);
  const { addProduct, updateOrderItem, getOrderItemByProduct } =
    useOrderFormActions();

  const { decreaseQuantityProduct } = useProductFormActions();

  const onAddProductToCart = () => {
    if (
      product.type === SingleProductType &&
      product.unitType === KG_UNIT_TYPE
    ) {
      setOpenKgCalculator(true);
      return;
    }

    addProduct(product);
    decreaseQuantityProduct(product.id!);
  };

  const onKgCalculatorSubmit = (kg: number) => {
    const orderItem = getOrderItemByProduct(product.id!);
    if (orderItem) {
      updateOrderItem({
        ...orderItem,
        quantity: kg,
        total: mul(kg)(product.price),
      });
      setOpenKgCalculator(false);
      return;
    }

    addProduct(product, kg);
    setOpenKgCalculator(false);
  };

  return (
    <div className="relative">
      {openKgCalculator && (
        <KgCalculatorForm
          open={openKgCalculator}
          onOpenChange={setOpenKgCalculator}
          defaultValue={1}
          productPrice={product.price}
          onSubmit={onKgCalculatorSubmit}
        />
      )}
      <Card
        onClick={onAddProductToCart}
        className="hover:absolute hover:h-auto hover:min-h-full hover:z-10 h-full w-full hover:max-h-none max-h-full group hover:shadow-xl transition duration-300"
      >
        <CardContent className="px-2">
          <div className="flex justify-end mt-2">
            <DescriptionProduct description={product.description}/>
          </div>
          <div className="mt-4 mx-auto relative w-[100px] h-[100px] rounded-md overflow-hidden">
            <Image fill className="object-cover" alt="Image" src={photoUrl} />
          </div>
          <p className="text-center font-light leading-4 mt-2 line-clamp-4 group-hover:line-clamp-none">
            {product.name}
          </p>
          <p className="text-lg text-center font-medium my-1">
            {formatPrice(product.price)}
          </p>
          <p className="text-sm text-center mt-1">
            {product.type == SingleProductType
              ? `${product.stock} ${UNIT_TYPE_MAPPER[product.unitType]}`
              : "Paquete"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
