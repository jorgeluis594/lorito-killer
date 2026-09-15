"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Search,
  Send,
  ShoppingBasket,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/use-toast";
import { cn, formatPrice } from "@/lib/utils";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { getMany } from "@/product/api_repository";
import { isDishProduct, type Product } from "@/product/types";
import type { TableWithSession } from "../types";
import { leaveEmptyTable, sendTableDraft } from "../actions";
import { useTableDraft } from "./use-table-draft";
import { TableRealtimeListener } from "./table-realtime-listener";
import { CancelOrderItemDialog } from "./cancel-order-item-dialog";
import ProductThumbnail from "@/new-order/components/product-thumbnail";

export function TableOrderView({
  table,
  canEdit = true,
}: {
  table: TableWithSession;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const session = table.activeSession!;
  const draft = useTableDraft(session);
  const categories = useCategoryStore((state) => state.categories);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const showingCategories = categoryId === null;
  const categoryName =
    categories.find((category) => category.id === categoryId)?.name ?? "Todos";
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [retry, setRetry] = useState(0);
  const [mobileView, setMobileView] = useState<"products" | "order">(
    "products",
  );
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const roundIdRef = useRef<string | null>(null);
  const [error, setError] = useState("");
  const editable = canEdit && session.status === "OPEN";
  const refresh = useCallback(() => router.refresh(), [router]);
  const sentItems = session.order?.orderItems ?? [];
  const sentTotal =
    sentItems.reduce((sum, item) => sum + Math.round(item.total * 100), 0) /
    100;
  const draftTotal =
    draft.items.reduce(
      (sum, item) => sum + Math.round(item.productPrice * 100) * item.quantity,
      0,
    ) / 100;
  const count = draft.items.reduce((sum, item) => sum + item.quantity, 0);
  const rounds = [...new Set(sentItems.map((item) => item.round))];

  useEffect(() => {
    if (categoryId === null) return;
    let cancelled = false;
    setSearching(true);
    setSearchError("");
    const timeout = setTimeout(
      async () => {
        try {
          const result = await getMany({
            q: query,
            categoryId,
            limit: 60,
            sortBy: "name_asc",
          });
          if (cancelled) return;
          if (result.success)
            setProducts(result.data.filter((product) => !product.hidden));
          else {
            setProducts([]);
            setSearchError("No se pudieron cargar los productos.");
          }
        } catch {
          if (!cancelled) {
            setProducts([]);
            setSearchError("No se pudieron cargar los productos.");
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
      },
      query ? 250 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, categoryId, retry]);

  function selectCategory(id: string | null) {
    setQuery("");
    setProducts([]);
    setSearching(true);
    setSearchError("");
    setCategoryId(id);
  }

  function add(product: Product) {
    if (!product.id || !editable || busyRef.current) return;
    roundIdRef.current = null;
    const existing = isDishProduct(product)
      ? undefined
      : draft.items.find((item) => item.productId === product.id);
    draft.edit(
      existing
        ? draft.items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [
            ...draft.items,
            {
              productId: product.id,
              productName: product.name,
              productPrice: product.price,
              quantity: 1,
              notes: "",
            },
          ],
    );
  }

  async function finish(send: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (editable && !(await draft.flush())) return;
      if (editable) {
        const result = send
          ? await sendTableDraft(
              session.id,
              draft.revision.current,
              (roundIdRef.current ??= crypto.randomUUID()),
            )
          : await leaveEmptyTable(session.id, draft.revision.current);
        if (!result.success) {
          setError(result.message);
          return;
        }
      }
      if (send)
        toast({
          title: `Pedido de mesa ${table.label || table.number} enviado`,
          description: "Cocina y barra ya pueden prepararlo.",
        });
      router.push("/dashboard/tables");
      router.refresh();
    } catch {
      setError(
        "No se pudo completar la acción. Revisa el pedido antes de volver a intentar.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function openPayment() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (editable && !(await draft.flush())) return;
      router.push(
        `/dashboard/tables/${table.id}/payment?session=${session.id}`,
      );
    } catch {
      setError("No se pudo abrir la cuenta. Vuelve a intentarlo.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="flex h-dvh flex-col">
      <TableRealtimeListener onEvent={refresh} />
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => finish(false)}
            disabled={busy}
            aria-label="Volver a mesas"
          >
            <ArrowLeft aria-hidden />
            <span className="hidden sm:inline">Mesas</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold break-words">
              Mesa {table.label || table.number}
            </h1>
            <p className="text-xs text-muted-foreground">
              {session.status === "BILL_REQUESTED"
                ? "Cuenta pedida · pedido de solo lectura"
                : "Toma de pedido"}
            </p>
          </div>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
          role="status"
        >
          {draft.status === "saving" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : draft.status === "saved" ? (
            <Check className="size-3" aria-hidden />
          ) : null}
          {draft.status === "saved"
            ? "Guardado"
            : draft.status === "error"
              ? "Sin guardar"
              : "Guardando…"}
        </span>
      </header>
      {error || draft.error ? (
        <div
          role="alert"
          className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          <p className="min-w-0 flex-1">{error || draft.error}</p>
          {draft.error ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void draft.flush()}
              disabled={busy}
            >
              Reintentar guardado
            </Button>
          ) : null}
          {draft.error.includes("otro dispositivo") ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Se descartarán tus cambios sin guardar para ver el pedido actualizado de la mesa. ¿Continuar?",
                  )
                ) {
                  draft.reloadSaved();
                }
              }}
            >
              Ver pedido guardado
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] lg:grid-cols-[minmax(0,1fr)_400px]">
        <section
          aria-label="Productos"
          className={cn(
            "min-h-0 flex-col md:flex",
            mobileView === "products" ? "flex" : "hidden",
          )}
        >
          <div className="flex shrink-0 items-center gap-2 px-4 pb-4 pt-4 sm:px-6">
            {showingCategories ? (
              <h2 className="text-lg font-bold">Categorías</h2>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="h-auto min-h-11 min-w-0 max-w-[55%] gap-2 whitespace-normal text-left font-bold"
                  aria-label={`Cambiar categoría: ${categoryName}`}
                  onClick={() => selectCategory(null)}
                >
                  <ArrowLeft className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">{categoryName}</span>
                </Button>
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    aria-label="Buscar productos"
                    type="search"
                    placeholder="Buscar…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-11 pl-9"
                  />
                </div>
              </>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
            {showingCategories ? (
              <nav
                aria-label="Categorías de productos"
                className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3"
              >
                {categories
                  .filter((category) => category.id)
                  .map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => selectCategory(category.id!)}
                      className="flex min-h-24 flex-col items-start justify-between gap-4 rounded-xl border bg-secondary p-4 text-left text-secondary-foreground transition-colors hover:border-primary hover:bg-accent md:min-h-32"
                    >
                      <span className="w-full text-base font-bold break-words">
                        {category.name}
                      </span>
                      <ChevronRight className="size-5 self-end" aria-hidden />
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => selectCategory("")}
                  className="flex min-h-24 flex-col items-start justify-between gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent md:min-h-32"
                >
                  <span className="text-base font-bold">
                    Todos los productos
                  </span>
                  <ChevronRight className="size-5 self-end" aria-hidden />
                </button>
              </nav>
            ) : searching ? (
              <div role="status" className="grid grid-cols-2 gap-2 md:gap-3">
                <span className="sr-only">Cargando productos</span>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-xl bg-muted md:h-40"
                  />
                ))}
              </div>
            ) : searchError ? (
              <div className="flex flex-col items-start gap-3 py-8">
                <p role="alert">{searchError}</p>
                <Button
                  variant="outline"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Reintentar
                </Button>
              </div>
            ) : products.length ? (
              <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3">
                {products.map((product) => {
                  const quantity =
                    draft.items.find((item) => item.productId === product.id)
                      ?.quantity ?? 0;
                  return (
                    <button
                      key={product.id}
                      disabled={!editable || busy}
                      onClick={() => add(product)}
                      aria-label={`Agregar ${product.name}`}
                      className="relative flex min-h-24 flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:min-h-40 md:gap-3 md:p-4"
                    >
                      {product.photos?.[0]?.url ? (
                        <ProductThumbnail
                          src={product.photos[0].url}
                          className="hidden size-14 md:block"
                        />
                      ) : null}
                      <span className="min-w-0 flex-1 text-sm font-bold break-words">
                        {product.name}
                      </span>
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="text-sm tabular-nums">
                          {formatPrice(product.price)}
                        </span>
                        <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-sm font-bold">
                          {quantity || <Plus className="size-4" aria-hidden />}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No hay productos para esta búsqueda. Prueba otro nombre o
                categoría.
              </p>
            )}
            {!showingCategories && !searching && products.length === 60 ? (
              <p className="pt-4 text-xs text-muted-foreground">
                Se muestran 60 productos. Busca por nombre para encontrar más.
              </p>
            ) : null}
          </div>
        </section>
        <section
          aria-label="Pedido de la mesa"
          className={cn(
            "min-h-0 flex-col border-border bg-card md:flex md:border-l",
            mobileView === "order" ? "flex" : "hidden",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-4">
            <h2 className="text-lg font-bold">Pedido</h2>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileView("products")}
            >
              <Plus aria-hidden /> Agregar
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
            <section
              className="flex flex-col gap-3"
              aria-labelledby="unsent-heading"
            >
              <h3 id="unsent-heading" className="text-sm font-bold">
                Por enviar{" "}
                <span className="font-normal text-muted-foreground">
                  · {count}
                </span>
              </h3>
              {draft.items.length ? (
                draft.items.map((item, index) => (
                  <div
                    key={`${item.productId}-${index}`}
                    className="flex flex-col gap-3 border-b pb-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-bold break-words">
                        {item.productName}
                      </p>
                      <span className="shrink-0 text-sm tabular-nums">
                        {formatPrice(item.productPrice * item.quantity)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(item.productPrice)} c/u
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={busy || !editable}
                          aria-label={`Quitar uno de ${item.productName}`}
                          onClick={() => (
                            (roundIdRef.current = null),
                            draft.edit(
                              draft.items
                                .map((row, rowIndex) =>
                                  rowIndex === index
                                    ? { ...row, quantity: row.quantity - 1 }
                                    : row,
                                )
                                .filter((row) => row.quantity > 0),
                            )
                          )}
                        >
                          <Minus aria-hidden />
                        </Button>
                        <span className="min-w-6 text-center text-sm font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={busy || !editable}
                          aria-label={`Agregar uno de ${item.productName}`}
                          onClick={() => (
                            (roundIdRef.current = null),
                            draft.edit(
                              draft.items.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, quantity: row.quantity + 1 }
                                  : row,
                              ),
                            )
                          )}
                        >
                          <Plus aria-hidden />
                        </Button>
                      </div>
                    </div>
                    <Input
                      aria-label={`Nota para ${item.productName}`}
                      placeholder="Nota para cocina o barra"
                      maxLength={200}
                      value={item.notes ?? ""}
                      disabled={busy || !editable}
                      onChange={(event) => (
                        (roundIdRef.current = null),
                        draft.edit(
                          draft.items.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, notes: event.target.value }
                              : row,
                          ),
                        )
                      )}
                    />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-start gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  <ShoppingBasket className="size-5" aria-hidden />
                  <p>
                    Agrega productos para empezar. Se enviarán juntos a cocina y
                    barra.
                  </p>
                </div>
              )}
            </section>
            {sentItems.length ? (
              <section
                aria-labelledby="sent-heading"
                className="flex flex-col gap-4"
              >
                <h3 id="sent-heading" className="text-sm font-bold">
                  Ya enviado{" "}
                  <span className="float-right font-normal tabular-nums">
                    {formatPrice(sentTotal)}
                  </span>
                </h3>
                {rounds.map((round) => {
                  const items = sentItems.filter(
                    (item) => item.round === round,
                  );
                  const roundDetails = session.order?.rounds?.find(
                    (entry) => entry.number === round,
                  );
                  return (
                    <div key={round} className="flex flex-col gap-3">
                      <p className="text-xs text-muted-foreground">
                        Pedido {round}
                        {roundDetails
                          ? ` · ${roundDetails.responsible.name || "Sin nombre"} · ${new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(roundDetails.createdAt))}`
                          : ""}
                      </p>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-1 border-b pb-3 text-sm"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="min-w-0 break-words">
                              {item.quantity} × {item.productName}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {formatPrice(item.total)}
                            </span>
                          </div>
                          {item.notes ? (
                            <p className="text-xs text-muted-foreground break-words">
                              {item.notes}
                            </p>
                          ) : null}
                          {roundDetails?.items.find(
                            (roundItem) => roundItem.orderItemId === item.id,
                          )?.kitchen ? (
                            <p className="text-xs text-muted-foreground">
                              Kitchen:{" "}
                              {
                                roundDetails.items.find(
                                  (roundItem) =>
                                    roundItem.orderItemId === item.id,
                                )!.kitchen!.name
                              }
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            Enviado
                          </p>
                          {roundDetails?.items.find(
                            (roundItem) => roundItem.orderItemId === item.id,
                          )?.cancelledQuantity ? (
                            <p className="text-xs text-muted-foreground">
                              {
                                roundDetails.items.find(
                                  (roundItem) =>
                                    roundItem.orderItemId === item.id,
                                )!.cancelledQuantity
                              }{" "}
                              cancelado(s) de{" "}
                              {
                                roundDetails.items.find(
                                  (roundItem) =>
                                    roundItem.orderItemId === item.id,
                                )!.quantity
                              }
                            </p>
                          ) : null}
                          {editable && item.quantity > 0 ? (
                            <CancelOrderItemDialog
                              orderRoundItemId={
                                roundDetails?.items.find(
                                  (roundItem) =>
                                    roundItem.orderItemId === item.id,
                                )?.id
                              }
                              availableQuantity={item.quantity}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            ) : null}
          </div>
          <footer className="flex shrink-0 flex-col gap-3 border-t p-4">
            <Button
              variant="outline"
              className="min-h-12 w-full"
              disabled={busy || sentTotal <= 0}
              onClick={openPayment}
            >
              <ReceiptText aria-hidden />
              {session.status === "BILL_REQUESTED"
                ? "Ver cobro en caja"
                : "Cobrar cuenta"}{" "}
              · {formatPrice(sentTotal)}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <span>Total por enviar</span>
              <strong className="text-lg tabular-nums">
                {formatPrice(draftTotal)}
              </strong>
            </div>
            <Button
              disabled={!editable || !count || busy}
              className="min-h-12 w-full"
              onClick={() => finish(true)}
            >
              {busy ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              Enviar pedido
            </Button>
          </footer>
        </section>
      </div>
      {mobileView === "products" ? (
        <div className="shrink-0 border-t bg-card p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
          <Button
            className="min-h-12 w-full"
            onClick={() => setMobileView("order")}
          >
            <ShoppingBasket aria-hidden />
            Ver pedido
            {count
              ? ` · ${count} · ${formatPrice(draftTotal)}`
              : sentItems.length
                ? ` · ${formatPrice(sentTotal)}`
                : ""}
          </Button>
        </div>
      ) : null}
    </main>
  );
}
