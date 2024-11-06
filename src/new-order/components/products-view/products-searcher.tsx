"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Search } from "lucide-react";
import { getMany, type GetManyParams } from "@/product/api_repository";
import { useToast } from "@/shared/components/ui/use-toast";
import ProductList from "@/new-order/components/products-view/product-list";
import { debounce, isBarCodeValid } from "@/lib/utils";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { SortOptions } from "@/product/types";
import { sortOptions } from "@/product/constants";
import { findProduct } from "@/product/api_repository";
import { useOrderFormActions } from "@/new-order/order-form-provider";
import {
  useProductFormActions,
  useProductFormStore,
} from "@/new-order/components/products-view/product-searcher-form-provider";

export default function ProductsSearcher() {
  const { setProducts } = useProductFormActions();
  const products = useProductFormStore((store) => store.products);
  const [search, setSearch] = useState<string>("");
  const [sortValue, setSortValue] = useState<keyof SortOptions>("created_desc");
  const { categories } = useCategoryStore((store) => store);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { toast } = useToast();
  const [skuValue, setSkuValue] = useState<string>("");
  const { addProduct } = useOrderFormActions();

  const searchProduct = async () => {
    const params: GetManyParams = { categoryId, sortBy: sortValue };
    if (search.length || search !== "") {
      params["q"] = search;
    }
    if (search.length === 0) {
      params["limit"] = 20;
    }
    const response = await getMany(params);

    if (params["q"] !== search) return;

    if (!response.success) {
      toast({
        title: "Error",
        variant: "destructive",
        description: response.message,
      });
      return;
    }

    setProducts(response.data);
  };

  const onSearchSubmit = debounce(searchProduct, 200);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    onSearchSubmit();
  }, [search, categoryId, sortValue]);

  useEffect(() => {
    searchProduct();
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === "all") {
      setCategoryId("");
    } else {
      setCategoryId(categoryId);
    }
  };

  const handleSortChange = (sortKey: keyof SortOptions) => {
    setSortValue(sortKey);
  };

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const skuValueRef = useRef(skuValue);

  useEffect(() => {
    skuValueRef.current = skuValue;
  }, [skuValue]);

  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.keyCode === 13) {
      findProduct(skuValueRef.current).then((response) => {
        if (!response.success) {
          toast({
            title: "Error",
            variant: "destructive",
            description: `Producto con sku: ${skuValueRef.current} no encontrado`,
          });
          return;
        }

        addProduct(response.data);
        setSkuValue("");
      });

      barcodeInputRef.current?.focus();
    }
  };

  useEffect(() => {
    const currentElement = barcodeInputRef.current;
    if (currentElement) {
      const handleKeyDown = (ev: KeyboardEvent) =>
        onKeyDown(ev as unknown as React.KeyboardEvent);
      currentElement.addEventListener("keydown", handleKeyDown);
      return () => {
        currentElement.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [barcodeInputRef.current, onKeyDown]);

  return (
    <div className="h-full w-100 p-5 pb-0 grid grid-rows-[7rem_1fr]">
      <div className="w-full border-b">
        <div className="w-1/2 md:grid md:grid-cols-2 gap-4 mb-2">
          <Select onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all" value="all">
                Todos los productos
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id!}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="Ordernar por" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortOptions).map(([key, { name }]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full items-center space-x-2">
          <Button type="button" onClick={onSearchSubmit}>
            <Search className="h-4 w-5" />
          </Button>
          <div className="grid grid-cols-4 gap-3">
            <Input
              placeholder="Nombre del producto"
              className="col-span-2"
              onChange={onSearchChange}
            />
            <Input
              placeholder="Código de barra"
              className="col-span-1"
              autoFocus={true}
              value={skuValue}
              onChange={(e) => setSkuValue(e.target.value)}
              ref={barcodeInputRef}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="mt-4">
        <ProductList products={products} />
      </ScrollArea>
    </div>
  );
}
