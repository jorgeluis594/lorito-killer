"use client";

import ProductsSearcher from "@/components/forms/order-form/products-searcher";
import Cart from "@/components/forms/order-form/cart";

export default function OrderForm() {
  return (
    <div className="h-[calc(100vh-theme(space.14))]">
      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-[1fr_550px]">
          <ProductsSearcher />
          <Cart />
        </div>
      </div>
    </div>
  );
}
