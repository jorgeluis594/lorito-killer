"use client";

import { Product } from "@/product/types";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

interface ProductListProps {
  products: Product[];
}

function ProductItem({ product }: { product: Product }) {
  const photoUrl = product.photos![0]?.url || "";

  return (
    <Card>
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

export default function ProductList({ products }: ProductListProps) {
  return (
    <div className="p-4 mt-4 flex-wrap justify-center grid grid-flow-row auto-rows-[250px] grid-cols-[repeat(auto-fill,220px)] gap-4">
      {products.length ? (
        products.map((product) => (
          <ProductItem key={product.id} product={product} />
        ))
      ) : (
        <div className="text-center">No hay productos</div>
      )}
    </div>
  );
}
