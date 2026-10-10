"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import ProductsSearcher from "@/new-order/components/products-view/products-searcher";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { confirmFulfillmentRound } from "@/order/rounds/fulfillment-actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from "@/shared/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";
import {
  validateDeliveryDetails,
  type DeliveryDetailsErrors,
  type DeliveryDetailsField,
} from "@/delivery/use-cases/validate-delivery-details";

type DeliveryForm = Record<DeliveryDetailsField, string>;

const emptyDeliveryForm: DeliveryForm = {
  name: "",
  phone: "",
  address: "",
  reference: "",
  fee: "",
  expectedPaymentMethod: "",
  cashPaysWith: "",
};

export default function FulfillmentOrder({
  initialOrderId,
  initialOrderType = "TAKE_AWAY",
}: {
  initialOrderId?: string;
  initialOrderType?: "TAKE_AWAY" | "DELIVERY";
}) {
  const order = useOrderFormStore((state) => state.order);
  const {
    reset,
    removeOrderItem,
    increaseQuantity,
    decreaseQuantity,
    updateOrderItem,
  } = useOrderFormActions();
  const [orderType, setOrderType] = useState<"TAKE_AWAY" | "DELIVERY">(
    initialOrderType,
  );
  const [orderId, setOrderId] = useState<string | undefined>(initialOrderId);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<DeliveryForm>(emptyDeliveryForm);
  const [errors, setErrors] = useState<DeliveryDetailsErrors>({});
  const { toast } = useToast();
  const router = useRouter();

  // Los datos de entrega solo se capturan al crear; las adiciones usan los guardados.
  const showDeliveryForm = orderType === "DELIVERY" && !orderId;
  const feeAmount =
    showDeliveryForm && form.fee.trim() !== "" && Number(form.fee) >= 0
      ? Number(form.fee)
      : 0;
  const grandTotal = order.total + feeAmount;

  const setField = (field: DeliveryDetailsField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit() {
    if (showDeliveryForm) {
      const check = validateDeliveryDetails(form, grandTotal);
      if (!check.success) {
        setErrors(check.errors);
        toast({ variant: "destructive", description: check.message });
        return;
      }
    }
    setSubmitting(true);
    const response = await confirmFulfillmentRound({
      orderId,
      orderType,
      delivery: showDeliveryForm
        ? {
            ...form,
            expectedPaymentMethod: form.expectedPaymentMethod || null,
            cashPaysWith: form.cashPaysWith || null,
          }
        : undefined,
      roundId: crypto.randomUUID(),
      items: order.orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    });
    setSubmitting(false);
    if (!response.success) {
      toast({ variant: "destructive", description: response.message });
      return;
    }
    setOrderId(response.data.orderId);
    setForm(emptyDeliveryForm);
    reset();
    toast({
      title:
        response.data.number === 1
          ? "Pedido confirmado"
          : "Adicionales enviados",
      description: `Ronda ${response.data.number} enviada a ${response.data.printJobIds.length} impresora(s).`,
    });
    if (!orderId) router.push(`/dashboard/orders/${response.data.orderId}`);
  }

  return (
    <div className="mx-auto grid h-[calc(100dvh-3.5rem)] max-w-[1600px] gap-6 overflow-hidden p-4 lg:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)]">
      <section className="flex min-h-0 flex-col rounded-xl border bg-card">
        <header className="space-y-3 border-b p-4">
          <div>
            <h1 className="text-xl font-bold">Pedido para preparar</h1>
            <p className="text-sm text-muted-foreground">
              Confirma ahora; el cobro puede hacerse después.
            </p>
          </div>
          <Select
            value={orderType}
            onValueChange={(value) => setOrderType(value as typeof orderType)}
            disabled={Boolean(orderId)}
          >
            <SelectTrigger aria-label="Tipo de pedido">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TAKE_AWAY">Para llevar</SelectItem>
              <SelectItem value="DELIVERY">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {showDeliveryForm && (
            <fieldset className="mb-4 grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">
                Datos de entrega
              </legend>
              <DeliveryField label="Nombre del cliente" error={errors.name}>
                <Input
                  autoComplete="off"
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                />
              </DeliveryField>
              <DeliveryField label="Teléfono" error={errors.phone}>
                <Input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="987 654 321"
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                />
              </DeliveryField>
              <DeliveryField
                label="Dirección"
                error={errors.address}
                className="sm:col-span-2"
              >
                <Input
                  autoComplete="off"
                  maxLength={300}
                  value={form.address}
                  onChange={(event) => setField("address", event.target.value)}
                />
              </DeliveryField>
              <DeliveryField
                label="Referencia (opcional)"
                error={errors.reference}
                className="sm:col-span-2"
              >
                <Input
                  autoComplete="off"
                  maxLength={300}
                  value={form.reference}
                  onChange={(event) =>
                    setField("reference", event.target.value)
                  }
                />
              </DeliveryField>
              <DeliveryField label="Envío (S/)" error={errors.fee}>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.fee}
                  onChange={(event) => setField("fee", event.target.value)}
                />
              </DeliveryField>
              <DeliveryField
                label="Pago esperado (opcional)"
                error={errors.expectedPaymentMethod}
              >
                <Select
                  value={form.expectedPaymentMethod || "NONE"}
                  onValueChange={(value) => {
                    setField(
                      "expectedPaymentMethod",
                      value === "NONE" ? "" : value,
                    );
                    if (value !== "CASH") setField("cashPaysWith", "");
                  }}
                >
                  <SelectTrigger aria-label="Pago esperado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin definir</SelectItem>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                    <SelectItem value="WALLET">Billetera</SelectItem>
                  </SelectContent>
                </Select>
              </DeliveryField>
              {form.expectedPaymentMethod === "CASH" && (
                <DeliveryField
                  label="Paga con (S/)"
                  error={errors.cashPaysWith}
                >
                  <Input
                    inputMode="decimal"
                    placeholder={grandTotal.toFixed(2)}
                    value={form.cashPaysWith}
                    onChange={(event) =>
                      setField("cashPaysWith", event.target.value)
                    }
                  />
                </DeliveryField>
              )}
            </fieldset>
          )}
          {order.orderItems.length ? (
            <ul className="space-y-3">
              {order.orderItems.map((item) => (
                <li key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 font-medium">
                      {item.productName}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Quitar uno de ${item.productName}`}
                      onClick={() => decreaseQuantity(item.id)}
                    >
                      <Minus />
                    </Button>
                    <span className="w-10 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Agregar uno de ${item.productName}`}
                      onClick={() => increaseQuantity(item.id)}
                    >
                      <Plus />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Eliminar ${item.productName}`}
                      onClick={() => removeOrderItem(item.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <Input
                    className="mt-2"
                    aria-label={`Observaciones de ${item.productName}`}
                    placeholder="Observaciones de preparación"
                    value={item.notes ?? ""}
                    onChange={(event) =>
                      updateOrderItem({ ...item, notes: event.target.value })
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Agrega los productos de esta ronda.
            </p>
          )}
        </div>
        <footer className="border-t p-4">
          {showDeliveryForm && (
            <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>Envío</span>
              <span>{formatPrice(feeAmount)}</span>
            </div>
          )}
          <div className="mb-3 flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(grandTotal)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!order.orderItems.length || submitting}
            onClick={() => void submit()}
          >
            {submitting
              ? "Confirmando…"
              : orderId
                ? "Enviar adicionales"
                : "Confirmar sin cobrar"}
            {!submitting && <ArrowRight data-icon="inline-end" />}
          </Button>
        </footer>
      </section>
      <div className="min-h-0 overflow-hidden rounded-xl border bg-card p-3">
        <ProductsSearcher />
      </div>
    </div>
  );
}

function DeliveryField({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1 text-sm ${className ?? ""}`}>
      <span className="font-medium">{label}</span>
      {children}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}
