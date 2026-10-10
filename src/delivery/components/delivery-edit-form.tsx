"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { editDeliveryDetails } from "../actions";
import {
  validateDeliveryDetails,
  type DeliveryDetailsErrors,
  type DeliveryDetailsField,
} from "../use-cases/validate-delivery-details";

type Props = {
  orderId: string;
  /** Versión (`Order.updatedAt`) con la que se cargó el detalle. */
  updatedAt: string;
  /** Hay comprobante: solo se puede corregir el contacto. */
  logisticsLocked: boolean;
  itemsTotal: number;
  initial: {
    name: string;
    phone: string;
    address: string;
    reference: string | null;
    fee: number;
    expectedPaymentMethod: "CASH" | "WALLET" | null;
    cashPaysWith: number | null;
  };
};

type Form = Record<DeliveryDetailsField, string>;

export default function DeliveryEditForm({
  orderId,
  updatedAt,
  logisticsLocked,
  itemsTotal,
  initial,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<DeliveryDetailsErrors>({});
  const [form, setForm] = useState<Form>({
    name: initial.name,
    phone: initial.phone,
    address: initial.address,
    reference: initial.reference ?? "",
    fee: String(initial.fee),
    expectedPaymentMethod: initial.expectedPaymentMethod ?? "",
    cashPaysWith:
      initial.cashPaysWith === null ? "" : String(initial.cashPaysWith),
  });
  const setField = (field: DeliveryDetailsField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Editar datos de entrega
      </Button>
    );

  const submit = () => {
    const feeAmount = Number(form.fee);
    const total = Number.isFinite(feeAmount)
      ? itemsTotal + feeAmount
      : undefined;
    const check = validateDeliveryDetails(form, total);
    if (!check.success) {
      setErrors(check.errors);
      return;
    }
    startTransition(async () => {
      const result = await editDeliveryDetails({
        orderId,
        updatedAt,
        ...form,
        reference: form.reference || null,
        expectedPaymentMethod: form.expectedPaymentMethod || null,
        cashPaysWith: form.cashPaysWith || null,
      });
      toast({
        variant: result.success ? "default" : "destructive",
        description: result.success
          ? "Datos de entrega actualizados."
          : result.message,
      });
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <form
      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Field label="Nombre del cliente" error={errors.name}>
        <Input
          autoComplete="off"
          maxLength={120}
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
        />
      </Field>
      <Field label="Teléfono" error={errors.phone}>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          value={form.phone}
          onChange={(event) => setField("phone", event.target.value)}
        />
      </Field>
      <Field label="Dirección" error={errors.address} className="sm:col-span-2">
        <Input
          autoComplete="off"
          maxLength={300}
          value={form.address}
          onChange={(event) => setField("address", event.target.value)}
        />
      </Field>
      <Field
        label="Referencia (opcional)"
        error={errors.reference}
        className="sm:col-span-2"
      >
        <Input
          autoComplete="off"
          maxLength={300}
          value={form.reference}
          onChange={(event) => setField("reference", event.target.value)}
        />
      </Field>
      {logisticsLocked && (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          El pedido ya tiene comprobante: el envío y el pago esperado no se
          pueden cambiar. El contacto sí.
        </p>
      )}
      <Field label="Envío (S/)" error={errors.fee}>
        <Input
          inputMode="decimal"
          disabled={logisticsLocked}
          value={form.fee}
          onChange={(event) => setField("fee", event.target.value)}
        />
      </Field>
      <Field label="Pago esperado" error={errors.expectedPaymentMethod}>
        <Select
          disabled={logisticsLocked}
          value={form.expectedPaymentMethod || "NONE"}
          onValueChange={(value) => {
            setField("expectedPaymentMethod", value === "NONE" ? "" : value);
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
      </Field>
      {form.expectedPaymentMethod === "CASH" && (
        <Field label="Paga con (S/)" error={errors.cashPaysWith}>
          <Input
            inputMode="decimal"
            disabled={logisticsLocked}
            value={form.cashPaysWith}
            onChange={(event) => setField("cashPaysWith", event.target.value)}
          />
        </Field>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          Guardar cambios
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Field({
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
