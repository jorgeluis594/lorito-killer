"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Product } from "@/product/types";
import { response } from "@/lib/types";
import { search as searchProducts, getMany } from "@/product/api_repository";
import { useToast } from "@/components/ui/use-toast";
import ProductList from "@/components/forms/order-form/product-list";
import { debounce } from "@/lib/utils";

export default function ProductsSearcher() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState<string>("");
  const { toast } = useToast();

  async function onSearchSubmit() {
    let response: response<Product[]>;

    if (search.length) {
      response = await searchProducts(search);
    } else {
      response = await getMany();
    }

    if (response.success) {
      setProducts(response.data);
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: response.message,
      });
    }
  }

  const onSearchChange = debounce(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value);
      await onSearchSubmit();
    },
    100,
  );

  useEffect(() => {
    onSearchSubmit();
  }, []);

  return (
    <div className="h-full w-100 p-5">
      <div className="flex w-100 items-center space-x-2">
        <Button type="button" onClick={onSearchSubmit}>
          <Search className="h-4 w-5" />
        </Button>
        <Input placeholder="Nombre del producto" onChange={onSearchChange} />
      </div>

      <ProductList products={products} />
    </div>
  );
}
