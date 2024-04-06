"use client";

import { getMany as getManyProducts } from "@/product/api_repository";
import ProductsClient from "@/components/tables/products/client";
import { Suspense, useEffect, useState } from "react";
import { Product } from "@/product/types";

const Products = () => {
  const [products, setProducts] = useState<null | Product[]>(null);
  const [error, setError] = useState<null | string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await getManyProducts();
      setIsLoading(false);

      if (!response.success) {
        setError(response.message);
      } else {
        setProducts(response.data);
      }
    };

    fetchProducts();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <ProductsClient data={products} isLoading={isLoading} />;
};

export default function ListProducts() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <Products />
    </Suspense>
  );
}
