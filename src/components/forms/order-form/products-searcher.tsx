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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Category } from "@/category/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoryStore } from "@/category/components/category-store-provider";

export default function ProductsSearcher() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState<string>("");
  const { categories } = useCategoryStore((store) => store);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { toast } = useToast();

  const searchProduct = async () => {
    let response: response<Product[]>;

    if (search.length || search !== "") {
      response = await searchProducts(search, categoryId);
    } else {
      response = await getMany(categoryId);
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
  };

  const onSearchSubmit = debounce(searchProduct, 200);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    onSearchSubmit();
  }, [search, categoryId]);

  useEffect(() => {
    searchProduct();
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setCategoryId(categoryId);
  };

  return (
    <div className="h-full w-100 p-5 pb-0 grid grid-rows-[70px_1fr]">
      <div className="w-full mb-4">
        <div className="w-1/2 md:grid md:grid-cols-2 gap-4 mb-2">
          <Select onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id!}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full items-center space-x-2">
          <Button type="button" onClick={onSearchSubmit}>
            <Search className="h-4 w-5" />
          </Button>
          <Input placeholder="Nombre del producto" onChange={onSearchChange} />
        </div>
      </div>

      <ScrollArea className="mt-4">
        <ProductList products={products} />
      </ScrollArea>
    </div>
  );
}
