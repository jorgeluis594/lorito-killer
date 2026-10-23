"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { useToast } from "@/shared/components/ui/use-toast";
import { editDeliveryDetails, openDelivery } from "../actions";
import type { DeliveryDetailsErrors } from "../use-cases/validate-delivery-details";

type Values = {
  phone: string;
  address: string;
  reference: string;
  name: string;
  fee: string;
};

const fields = [
  {
    key: "phone",
    label: "Teléfono",
    required: true,
    props: {
      inputMode: "tel",
      autoComplete: "tel",
      placeholder: "987 654 321",
      maxLength: 15,
    },
  },
  {
    key: "address",
    label: "Dirección",
    required: true,
    props: { autoComplete: "street-address", maxLength: 300 },
  },
  {
    key: "reference",
    label: "Referencia",
    hint: "Para el repartidor: portón verde, paga con S/ 100…",
    props: { maxLength: 300 },
  },
  {
    key: "name",
    label: "Nombre del cliente",
    hint: "Si lo dejas vacío, la tarjeta muestra el teléfono y la comanda la hora del pedido.",
    props: { autoComplete: "off", maxLength: 120 },
  },
] as const;

/**
 * Crea un delivery (y lleva a su toma de pedido) o, con `edit`, corrige los
 * datos de uno abierto. El envío se bloquea cuando el pedido ya tiene comprobante.
 */
export function DeliverySheet({
  defaultFee,
  edit,
}: {
  defaultFee?: number | null;
  edit?: {
    orderId: string;
    orderVersion: string;
    feeLocked: boolean;
    values: {
      phone: string;
      address: string;
      reference: string | null;
      name: string | null;
      fee: number;
    };
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const initial = (): Values =>
    edit
      ? {
          ...edit.values,
          reference: edit.values.reference ?? "",
          name: edit.values.name ?? "",
          fee: edit.values.fee.toFixed(2),
        }
      : {
          phone: "",
          address: "",
          reference: "",
          name: "",
          fee: defaultFee != null ? defaultFee.toFixed(2) : "",
        };
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<DeliveryDetailsErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function onOpenChange(next: boolean) {
    if (busy) return;
    if (next) {
      setValues(initial());
      setErrors({});
      setMessage("");
    }
    setOpen(next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const result = edit
        ? await editDeliveryDetails({
            ...values,
            orderId: edit.orderId,
            updatedAt: edit.orderVersion,
          })
        : await openDelivery(values);
      if (!result.success) {
        setErrors("errors" in result && result.errors ? result.errors : {});
        setMessage(result.message);
        setTimeout(
          () =>
            form
              .querySelector<HTMLInputElement>('[aria-invalid="true"]')
              ?.focus(),
          0,
        );
        return;
      }
      setOpen(false);
      if ("sessionId" in result.data)
        router.push(
          `/dashboard/tables/delivery/${result.data.sessionId}/order`,
        );
      else {
        toast({ title: "Datos de entrega guardados" });
        router.refresh();
      }
    } catch {
      setMessage(
        "No se recibió la respuesta. Revisa la conexión y vuelve a intentarlo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {/* El disparador vive aquí: un elemento llegado desde el servidor no
            hidrata dentro del Slot de Radix. */}
        {edit ? (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Editar datos de entrega"
          >
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus aria-hidden />
            Delivery
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col gap-0 overflow-y-auto rounded-t-xl p-0 pb-[env(safe-area-inset-bottom)] sm:bottom-4 sm:rounded-xl sm:border"
      >
        <SheetHeader className="px-5 pb-2 pt-5 text-left">
          <SheetTitle>
            {edit ? "Datos de entrega" : "Nuevo delivery"}
          </SheetTitle>
          <SheetDescription>
            {edit
              ? "El contacto se puede corregir en cualquier momento."
              : "Solo lo necesario para entregar. Después tomas el pedido."}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={submit}
          noValidate
          className="flex flex-col gap-4 px-5 pb-5 pt-3"
        >
          <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
            {fields.map((field) => {
              const id = `delivery-${field.key}`;
              const error = errors[field.key];
              const hintId = "hint" in field ? `${id}-hint` : undefined;
              return (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={id}>
                    {field.label}
                    {"required" in field ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · obligatorio
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    id={id}
                    {...field.props}
                    className="text-base"
                    required={"required" in field}
                    value={values[field.key]}
                    onChange={(event) =>
                      setValues({ ...values, [field.key]: event.target.value })
                    }
                    aria-invalid={!!error}
                    aria-describedby={
                      [error ? `${id}-error` : null, hintId]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  />
                  {error ? (
                    <p id={`${id}-error`} className="text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                  {hintId ? (
                    <p id={hintId} className="text-xs text-muted-foreground">
                      {"hint" in field ? field.hint : null}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delivery-fee">Envío</Label>
              <div className="relative w-40">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  S/
                </span>
                <Input
                  id="delivery-fee"
                  inputMode="decimal"
                  className="pl-9 text-base tabular-nums"
                  value={values.fee}
                  disabled={edit?.feeLocked}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      fee: event.target.value.replace(",", "."),
                    })
                  }
                  aria-invalid={!!errors.fee}
                  aria-describedby="delivery-fee-hint"
                />
              </div>
              {errors.fee ? (
                <p className="text-sm text-destructive">{errors.fee}</p>
              ) : null}
              <p
                id="delivery-fee-hint"
                className="text-xs text-muted-foreground"
              >
                {edit?.feeLocked
                  ? "El pedido ya tiene comprobante: el envío no cambia."
                  : edit
                    ? "Se suma al total del pedido."
                    : "Precargado con el último envío usado. 0 si es gratis."}
              </p>
            </div>
          </fieldset>
          {message ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {message}
            </p>
          ) : null}
          <Button
            type="submit"
            className="min-h-12 w-full gap-2"
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {edit ? "Guardar datos" : "Continuar al pedido"}
            {!busy && !edit ? <ArrowRight aria-hidden /> : null}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
