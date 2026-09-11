"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getMany, findProduct } from "@/product/api_repository";
import { type Product, type SortKey, isSingleProduct } from "@/product/types";
import { sortOptions } from "@/product/constants";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { useOrderFormActions } from "@/new-order/order-form-provider";
import KgCalculatorForm from "@/new-order/components/cart/kg-calculator-form";
import ProductThumbnail from "@/new-order/components/product-thumbnail";
import { cn, formatPrice, plus } from "@/lib/utils";

export default function ProductsSearcher() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("name_asc");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState(-1);
  const [pendingWeights, setPendingWeights] = useState<
    Array<{
      product: Product;
      id: string;
      version: number;
      resetSearch: boolean;
    }>
  >([]);
  const weightSelection = pendingWeights[0];
  const kgProduct = weightSelection?.product;
  const [announcement, setAnnouncement] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const { categories } = useCategoryStore((state) => state);
  const { addProduct, updateOrderItem, getOrderItemByProduct } =
    useOrderFormActions();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setActive(-1);
    const timeout = setTimeout(async () => {
      try {
        const response = await getMany({
          q: search.trim(),
          categoryId: categoryId !== "all" ? categoryId : undefined,
          sortBy,
        });
        if (cancelled) return;
        if (response.success) setProducts(response.data);
        else setError(response.message);
      } catch {
        if (!cancelled)
          setError("No se pudieron cargar los productos. Intenta nuevamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, categoryId, sortBy, retry]);

  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`sale-result-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function finishAdding(product: Product, resetSearch = true) {
    setAnnouncement(`${product.name} agregado a la venta`);
    if (!resetSearch) return;
    setSearch("");
    setActive(-1);
    input.current?.focus();
  }

  function selectProduct(product: Product, resetSearch = true) {
    if (isSingleProduct(product) && product.unitType === "kg") {
      setPendingWeights((pending) => [
        ...pending,
        {
          product,
          id: crypto.randomUUID(),
          version: requestVersion.current,
          resetSearch,
        },
      ]);
      return;
    }
    addProduct(product);
    finishAdding(product, resetSearch);
  }

  async function submitSearch() {
    if (!loading && !error && active >= 0 && products[active]) {
      selectProduct(products[active]);
      return;
    }
    const query = search.trim();
    if (!query) {
      return;
    }
    const version = requestVersion.current;
    try {
      const response = await findProduct(encodeURIComponent(query));
      if (response.success)
        selectProduct(response.data, version === requestVersion.current);
      else if (version === requestVersion.current) {
        setAnnouncement(
          "Selecciona un producto de los resultados con las flechas y Enter.",
        );
      }
    } catch {
      if (version === requestVersion.current)
        setError("No se pudo buscar el código. Intenta nuevamente.");
    }
  }

  return (
    <section
      aria-label="Buscar productos"
      className="flex min-h-0 flex-1 flex-col"
    >
      <h2 className="sr-only">Productos</h2>
      <form
        className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_140px_140px]"
        onSubmit={(event) => {
          event.preventDefault();
          void submitSearch();
        }}
      >
        <div className="relative col-span-2 min-w-0 lg:col-span-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="sale-product-search"
            ref={input}
            autoFocus
            autoComplete="off"
            className="pl-9 pr-10"
            placeholder="Nombre o código…"
            aria-label="Buscar por nombre o código de barras"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-controls="sale-product-results"
            aria-activedescendant={
              active >= 0 ? `sale-result-${active}` : undefined
            }
            value={search}
            onChange={(event) => {
              requestVersion.current += 1;
              setSearch(event.target.value);
              setLoading(true);
              setActive(-1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.repeat) event.preventDefault();
              if (event.key === "Escape") {
                requestVersion.current += 1;
                setSearch("");
                setActive(-1);
              }
              if (
                (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                !loading &&
                products.length
              ) {
                event.preventDefault();
                setActive((index) =>
                  event.key === "ArrowDown"
                    ? Math.min(index + 1, products.length - 1)
                    : Math.max(index - 1, 0),
                );
              }
            }}
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2"
              aria-label="Limpiar búsqueda"
              onClick={() => {
                requestVersion.current += 1;
                setSearch("");
                setActive(-1);
                input.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger aria-label="Categoría" className="min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id!}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortKey)}
        >
          <SelectTrigger aria-label="Ordenar productos" className="min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(sortOptions).map(([key, option]) => (
                <SelectItem key={key} value={key}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </form>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          id="sale-product-results"
          role="listbox"
          aria-label="Productos"
          aria-busy={loading}
        >
          {loading ? (
            <div
              className="flex flex-col gap-4 p-4"
              role="status"
              aria-label="Buscando productos"
            >
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="p-5" role="alert">
              <p>{error}</p>
              <Button
                type="button"
                variant="link"
                onClick={() => setRetry((value) => value + 1)}
              >
                Reintentar
              </Button>
            </div>
          ) : products.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No encontramos productos. Prueba otro nombre, escanea el código o
              cambia la categoría.
            </p>
          ) : (
            products.map((product, index) => (
              <button
                type="button"
                role="option"
                aria-selected={active === index}
                id={`sale-result-${index}`}
                key={product.id}
                className={cn(
                  "mb-2 flex min-h-20 w-full items-center gap-4 rounded-lg border border-transparent px-4 py-4 text-left hover:border-input hover:bg-accent focus-visible:bg-accent",
                  active === index && "bg-accent",
                )}
                onClick={() => selectProduct(product)}
              >
                <ProductThumbnail
                  src={product.photos?.[0]?.url}
                  className="size-12 sm:size-20"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{product.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {product.sku ? `${product.sku} · ` : ""}
                    {isSingleProduct(product)
                      ? `${product.stock} ${product.unitType === "kg" ? "kg" : "und"} en stock`
                      : product.type === "ServiceProduct"
                        ? "Servicio"
                        : "Paquete"}
                  </span>
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums">
                  {formatPrice(product.price)}
                  {isSingleProduct(product) && product.unitType === "kg" && (
                    <span className="block text-xs font-normal">por kg</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                  <Plus className="size-4" aria-hidden="true" />
                  Agregar
                </span>
              </button>
            ))
          )}
        </div>
      </div>
      {kgProduct && (
        <KgCalculatorForm
          key={weightSelection.id}
          open
          onOpenChange={(value) => {
            if (!value) {
              setPendingWeights((pending) => pending.slice(1));
              if (pendingWeights.length === 1) input.current?.focus();
            }
          }}
          defaultValue={1}
          productPrice={kgProduct.price}
          productName={kgProduct.name}
          onSubmit={(kg) => {
            const item = getOrderItemByProduct(kgProduct.id!);
            if (item)
              updateOrderItem({ ...item, quantity: plus(item.quantity)(kg) });
            else addProduct(kgProduct, kg);
            setPendingWeights((pending) => pending.slice(1));
            finishAdding(
              kgProduct,
              pendingWeights.length === 1 &&
                weightSelection.resetSearch &&
                weightSelection.version === requestVersion.current,
            );
          }}
        />
      )}
    </section>
  );
}
