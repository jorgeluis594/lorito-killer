"use client";

import { useState } from "react";
import { ArrowRight, Check, ShoppingBasket, Trash2 } from "lucide-react";
import type { DocumentType } from "@/document/types";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/components/ui/alert-dialog";
import CustomerSelector from "@/customer/components/customer-selector";
import NewCustomerModal from "@/customer/components/new-customer-modal";
import { fullName } from "@/customer/utils";
import { cn, formatPrice } from "@/lib/utils";
import PaymentModal from "@/new-order/components/create-order-modal/payment-modal";
import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import AddExpense from "@/cash-shift/components/add_expense";
import { useCompany } from "@/lib/use-company";
import CartItem from "@/new-order/components/cart/cart-item";
import ProductsSearcher from "@/new-order/components/products-view/products-searcher";

export default function Cart() {
  const order = useOrderFormStore((state) => state.order);
  const {
    setDocumentType,
    increaseQuantity,
    decreaseQuantity,
    reset,
    removeOrderItem,
    setCustomer,
    removeCustomer,
  } = useOrderFormActions();
  const company = useCompany();
  const cashShift = useCashShift();
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [mobileView, setMobileView] = useState<"products" | "cart">("products");
  const needsCustomer = order.documentType === "invoice" && !order.customer;

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col px-3 pt-3 sm:px-6">
      <h1 className="sr-only">Nueva venta</h1>
      <nav
        aria-label="Vistas de venta"
        className="mb-3 grid shrink-0 grid-cols-2 gap-2 lg:hidden"
      >
        <Button
          variant={mobileView === "products" ? "secondary" : "outline"}
          aria-pressed={mobileView === "products"}
          onClick={() => setMobileView("products")}
        >
          Productos
        </Button>
        <Button
          variant={mobileView === "cart" ? "secondary" : "outline"}
          aria-pressed={mobileView === "cart"}
          onClick={() => setMobileView("cart")}
        >
          Venta · {order.orderItems.length} · {formatPrice(order.total)}
        </Button>
      </nav>
      <div className="grid min-h-0 flex-1 gap-6 pb-3 lg:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)]">
        <div
          className={cn(
            "min-h-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground lg:flex",
            mobileView === "cart" ? "flex" : "hidden",
          )}
        >
          <section
            aria-label="Venta en curso"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-secondary px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold">Venta actual</h2>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>
                    {order.orderItems.length}{" "}
                    {order.orderItems.length === 1 ? "producto" : "productos"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Check className="size-3" aria-hidden="true" />
                    Caja abierta
                  </span>
                </p>
              </div>
              {cashShift && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Gastos</span>
                  <AddExpense />
                </div>
              )}
              {order.orderItems.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Vaciar venta"
                      title="Vaciar venta"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Vaciar esta venta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se quitarán todos los productos y descuentos de la venta
                        en curso.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Conservar venta</AlertDialogCancel>
                      <AlertDialogAction onClick={reset}>
                        Vaciar venta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {order.orderItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-5 py-6 text-center">
                <ShoppingBasket
                  className="size-9 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-lg font-semibold">Tu venta está vacía</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Agrega productos desde el catálogo. Aquí verás lo que tu
                  cliente llevará.
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    setMobileView("products");
                    requestAnimationFrame(() =>
                      document.getElementById("sale-product-search")?.focus(),
                    );
                  }}
                >
                  Buscar un producto
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
                <ul aria-label="Productos de la venta" className="@container">
                  {order.orderItems.map((item) => (
                    <li key={item.id}>
                      <CartItem
                        item={item}
                        increaseQuantity={increaseQuantity}
                        decreaseQuantity={decreaseQuantity}
                        removeOrderItem={removeOrderItem}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section
            aria-label="Cliente y comprobante"
            className="flex max-h-[30dvh] shrink-0 flex-col gap-3 overflow-y-auto border-t px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Cliente</span>
                <Button
                  variant="ghost"
                  onClick={() => setEditingCustomer(!editingCustomer)}
                  aria-expanded={editingCustomer || needsCustomer}
                  className="max-w-full"
                >
                  <span className="truncate">
                    {order.customer
                      ? fullName(order.customer)
                      : needsCustomer
                        ? "Seleccionar cliente"
                        : "Cliente general"}
                  </span>
                  <span className="ml-2 text-muted-foreground">Cambiar</span>
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="sale-document-type"
                  className="text-sm text-muted-foreground"
                >
                  Comprobante
                </label>
                <Select
                  value={order.documentType}
                  onValueChange={(value) =>
                    setDocumentType(value as DocumentType)
                  }
                >
                  <SelectTrigger id="sale-document-type" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ticket">Nota de venta</SelectItem>
                      <SelectItem
                        value="receipt"
                        disabled={!company.isBillingActivated}
                      >
                        Boleta
                      </SelectItem>
                      <SelectItem
                        value="invoice"
                        disabled={!company.isBillingActivated}
                      >
                        Factura
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(editingCustomer || needsCustomer) && (
              <div className="flex max-w-xl flex-col gap-2">
                {needsCustomer && (
                  <p className="text-sm text-muted-foreground">
                    Selecciona o crea un cliente con RUC para emitir la factura.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <CustomerSelector
                    value={order.customer}
                    onSelect={(customer) => {
                      setCustomer(customer);
                      setEditingCustomer(false);
                    }}
                  />
                  <NewCustomerModal />
                </div>
                {order.customer && order.documentType !== "invoice" && (
                  <Button
                    variant="link"
                    className="self-start"
                    onClick={() => {
                      removeCustomer();
                      setEditingCustomer(false);
                    }}
                  >
                    Usar cliente general
                  </Button>
                )}
              </div>
            )}
          </section>
          <footer className="flex shrink-0 flex-col gap-3 border-t px-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de la venta</p>
              <p
                className="text-3xl font-bold tracking-tight tabular-nums"
                aria-live="polite"
              >
                {formatPrice(order.total)}
              </p>
            </div>
            <Button
              size="lg"
              disabled={!cashShift || order.orderItems.length === 0}
              onClick={() => {
                if (needsCustomer) {
                  setEditingCustomer(true);
                  return;
                }
                setOpenPaymentModal(true);
              }}
            >
              {needsCustomer ? "Completar cliente" : "Continuar al pago"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </footer>
        </div>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-col lg:flex",
            mobileView === "products" ? "flex" : "hidden",
          )}
        >
          <ProductsSearcher />
          <Button
            className="mt-3 shrink-0 lg:hidden"
            onClick={() => setMobileView("cart")}
          >
            Ver venta · {order.orderItems.length} productos ·{" "}
            {formatPrice(order.total)}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
      <PaymentModal
        isOpen={openPaymentModal}
        onOpenChange={setOpenPaymentModal}
      />
    </div>
  );
}
