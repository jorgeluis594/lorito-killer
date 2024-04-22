"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Product } from "@/product/types";
import { getMany, type GetManyParams } from "@/product/api_repository";
import { useToast } from "@/components/ui/use-toast";
import ProductList from "@/components/forms/order-form/product-list";
import { debounce, isBarCodeValid } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { SortOptions } from "@/product/types";
import { sortOptions } from "@/product/constants";
import { useSymbologyScanner } from "@use-symbology-scanner/react";
import { findProduct } from "@/product/api_repository";
import { useOrderFormActions } from "@/components/forms/order-form/order-form-provider";

export default function ProductsSearcher() {
  const [products, setProducts] = useState<Product[]>([]);
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
    const response = await getMany(params);

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
  }, [search, categoryId, sortValue]);

  useEffect(() => {
    searchProduct();
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setCategoryId(categoryId);
  };

  const handleSortChange = (sortKey: keyof SortOptions) => {
    setSortValue(sortKey);
  };

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const handleSymbol = (symbol: any, _matchedSymbologies: any) => {
    if (isBarCodeValid(symbol, 3)) {
      setSkuValue(symbol);
      console.log("symbol", symbol);
      findProduct(symbol).then((response) => {
        if (!response.success) {
          toast({
            title: "Error",
            variant: "destructive",
            description: `Producto con sku: ${symbol} no encontrado`,
          });
          return;
        }
        console.log({ data: response.data });
        addProduct(response.data);
      });
    }
  };

  const skuValueRef = useRef(skuValue);

  useEffect(() => {
    skuValueRef.current = skuValue;
  }, [skuValue]);

  const onKeyDown = (ev: KeyboardEvent) => {
    console.log("from onKeyDown", { skuValue: skuValueRef.current });
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
    }
  };

  useEffect(() => {
    const currentElement = barcodeInputRef.current;
    if (currentElement) {
      currentElement.addEventListener("keydown", onKeyDown);
    }
    return () => {
      if (currentElement) {
        currentElement.removeEventListener("keydown", onKeyDown);
      }
    };
  }, []);

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
