"use client";

import { getMany as getManyProducts } from "@/product/api_repository";
import ProductsClient from "@/components/tables/products/client";
import { Suspense } from "react";

const Products = async () => {
  const response = await getManyProducts();

  if (!response.success) {
    return <div>Error: {response.message}</div>;
  }

  return <ProductsClient data={response.data} />;
};

export default function ListProducts() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <Products />
    </Suspense>
  );
}
