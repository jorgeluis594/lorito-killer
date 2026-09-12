"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./table-payment-view.module.css";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Smartphone,
  ReceiptText,
  TriangleAlert,
  Loader2,
  Banknote,
  Layers,
  Printer,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import { cn, formatPrice } from "@/lib/utils";
import {
  tableReceiptsEqual,
  TableReceiptSchema,
  type TablePaymentInput,
  type TableReceiptInput,
} from "../payment-schema";
import type {
  TablePaymentData,
  TablePaymentResult,
} from "../payment-repository";
import { confirmTablePayment, loadTablePayment } from "../payment-actions";
import { TableRealtimeListener } from "./table-realtime-listener";

const labels: Record<string, string> = {
  debit_card: "Tarjeta de débito",
  credit_card: "Tarjeta de crédito",
  wallet: "Billetera",
  cash: "Efectivo",
  combine: "Combinado",
  register: "Cobro en caja",
};
const documentLabels = {
  ticket: "Nota de venta",
  receipt: "Boleta",
  invoice: "Factura",
};
const emptyCustomer = {
  documentType: "DNI" as const,
  documentNumber: "",
  legalName: "",
  address: "",
};
const statuses: Record<string, string> = {
  PENDING: "Enviado",
  PREPARING: "En preparación",
  READY: "Listo para servir",
  SERVED: "Servido",
  CANCELLED: "Cancelado · no suma",
};

export function TablePaymentView({
  initialData,
  canCollectCash,
}: {
  initialData: TablePaymentData;
  canCollectCash: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [step, setStep] = useState<"review" | "payment">("review");
  const [receipt, setReceipt] = useState<TableReceiptInput>(
    initialData.receipt,
  );
  const [customer, setCustomer] = useState(
    initialData.receipt.customer ?? emptyCustomer,
  );
  const [includeCustomer, setIncludeCustomer] = useState(
    !!initialData.receipt.customer,
  );
  const [method, setMethod] = useState<TablePaymentInput["method"] | "">("");
  const [cashReceived, setCashReceived] = useState("");
  const [contributions, setContributions] = useState({
    cash: "",
    debit_card: "",
    credit_card: "",
    wallet: "",
  });
  const [wallet, setWallet] = useState({ name: "", operationCode: "" });
  const [result, setResult] = useState<TablePaymentResult | null>(
    initialData.result,
  );
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uncertain, setUncertain] = useState(false);
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [printStatus, setPrintStatus] = useState("");
  const dataRef = useRef(data);
  dataRef.current = data;
  const formRef = useRef<HTMLFormElement>(null);
  const paymentHeading = useRef<HTMLHeadingElement>(null);
  const accountHeading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const pendingInKitchen = data.items
    .filter((item) => item.status === "PENDING" || item.status === "PREPARING")
    .reduce((sum, item) => sum + item.quantity, 0);
  const waitingAtRegister = data.status === "BILL_REQUESTED" && !canCollectCash;
  const closed = data.status === "CLOSED" || data.status === "CANCELLED";
  const blocked =
    busy ||
    uncertain ||
    changed ||
    data.draftCount > 0 ||
    data.total <= 0 ||
    closed;
  const needsWallet =
    canCollectCash &&
    (method === "wallet" ||
      (method === "combine" && Number(contributions.wallet) > 0));
  const needsCash =
    method === "cash" ||
    (method === "combine" && Number(contributions.cash) > 0);
  const cashAmount =
    method === "cash" ? data.total : Number(contributions.cash);

  const refresh = useCallback(async () => {
    const current = dataRef.current;
    try {
      const response = await loadTablePayment(
        current.tableId,
        current.sessionId,
      );
      if (!response.success) {
        setError(response.message);
        return false;
      }
      const latest = response.data;
      const receiptChanged = !tableReceiptsEqual(
        current.receipt,
        latest.receipt,
      );
      if (latest.result) setResult(latest.result);
      if (
        latest.orderVersion !== current.orderVersion ||
        latest.revision !== current.revision ||
        latest.cashShift?.id !== current.cashShift?.id ||
        receiptChanged
      ) {
        setChanged(true);
        setMethod("");
      }
      if (receiptChanged) {
        setReceipt(latest.receipt);
        setCustomer(latest.receipt.customer ?? emptyCustomer);
        setIncludeCustomer(!!latest.receipt.customer);
        setError("");
        setFieldErrors({});
      }
      setData(latest);
      setUncertain(false);
      return true;
    } catch {
      setUncertain(true);
      setError(
        "No se pudo consultar el estado. Comprueba la conexión y vuelve a consultar antes de confirmar.",
      );
      return false;
    }
  }, []);

  const onRealtime = useCallback(() => {
    if (!busyRef.current) void refresh();
  }, [refresh]);
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible" && !busyRef.current)
        void refresh();
    };
    // ponytail: visible-page polling covers missed realtime events; replace if reliable replay becomes available.
    const interval = window.setInterval(check, 15000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [refresh]);

  useEffect(() => {
    if (result?.state || waitingAtRegister) resultHeading.current?.focus();
  }, [result?.state, waitingAtRegister]);

  useEffect(() => {
    if (step === "review") accountHeading.current?.focus();
    else paymentHeading.current?.focus();
  }, [step]);

  function receiptValue(): TableReceiptInput {
    return {
      documentType: receipt.documentType,
      customer:
        receipt.documentType === "invoice" ||
        (receipt.documentType === "receipt" && includeCustomer)
          ? customer
          : undefined,
    };
  }
  function validateReceipt() {
    const parsed = TableReceiptSchema.safeParse(receiptValue());
    if (parsed.success) {
      setFieldErrors({});
      return true;
    }
    setFieldErrors(
      Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join("."),
          issue.message,
        ]),
      ),
    );
    setTimeout(
      () =>
        formRef.current
          ?.querySelector<HTMLInputElement>('[aria-invalid="true"]')
          ?.focus(),
      0,
    );
    return false;
  }
  async function submit() {
    if (busyRef.current || blocked || !method || !validateReceipt()) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await confirmTablePayment({
        sessionId: data.sessionId,
        revision: data.revision,
        orderVersion: data.orderVersion,
        expectedTotal: data.total,
        cashShiftId: data.cashShift?.id ?? null,
        receipt: receiptValue(),
        method,
        ...(needsCash
          ? {
              cashReceived:
                cashReceived === "" ? undefined : Number(cashReceived),
            }
          : {}),
        ...(method === "combine"
          ? {
              contributions: Object.fromEntries(
                Object.entries(contributions).map(([key, value]) => [
                  key,
                  Number(value),
                ]),
              ) as TablePaymentInput["contributions"],
            }
          : {}),
        ...(needsWallet ? { wallet } : {}),
      });
      if (response.success) setResult(response.data);
      else {
        setError(response.message);
        setUncertain(true);
        await refresh();
      }
    } catch {
      setUncertain(true);
      setError(
        "La conexión se interrumpió. Consulta el estado para saber si el pago quedó registrado.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function print() {
    if (!result || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setPrintStatus("");
    try {
      const { printOrderReceipt } = await import(
        "@/printing/print-order-receipt"
      );
      const response = await printOrderReceipt(result.orderId);
      setPrintStatus(
        response.success
          ? response.message ?? "Comprobante enviado a impresión."
          : "El pago está confirmado. No se pudo imprimir; puedes reintentar o abrir el comprobante.",
      );
    } catch {
      setPrintStatus(
        "El pago está confirmado. No se pudo imprimir; vuelve a intentarlo.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const header = (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Button asChild variant="ghost" size="icon">
          <Link
            href={
              result || waitingAtRegister
                ? "/dashboard/tables"
                : `/dashboard/tables/${data.tableId}/order`
            }
            aria-label={
              result || waitingAtRegister
                ? "Volver a mesas"
                : "Volver al pedido"
            }
          >
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Mesa {data.tableLabel}</h1>
          <p className="text-sm text-muted-foreground">
            {result?.state === "paid" ? "Cuenta pagada" : "Cobro de la cuenta"}
          </p>
        </div>
      </div>
    </header>
  );
  if (result || waitingAtRegister) {
    const paid = result?.state === "paid";
    return (
      <main className="min-h-dvh">
        {header}
        <section
          className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10 sm:py-16"
          aria-labelledby="result-heading"
        >
          <div className="flex size-14 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            {paid ? (
              <Check className="size-7" aria-hidden />
            ) : (
              <ReceiptText className="size-7" aria-hidden />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h2
              ref={resultHeading}
              id="result-heading"
              className="text-2xl font-bold"
              tabIndex={-1}
            >
              {paid ? "Pago confirmado" : "Pendiente de cobro en caja"}
            </h2>
            <p className="text-muted-foreground">
              {paid
                ? "La mesa ya está libre."
                : "Caja completará el cobro. La mesa sigue ocupada."}
            </p>
          </div>
          <dl className="flex flex-col gap-3 border-y py-5">
            <div className="flex justify-between gap-4">
              <dt>Total de la cuenta</dt>
              <dd className="font-bold tabular-nums">
                {formatPrice(result?.total ?? data.total)}
              </dd>
            </div>
            {paid && result ? (
              <div className="flex justify-between gap-4">
                <dt>Medio de pago</dt>
                <dd>{labels[result.method]}</dd>
              </div>
            ) : null}
          </dl>
          <Button asChild className="min-h-12">
            <Link href="/dashboard/tables">
              Volver a mesas
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          {paid && result ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <a
                  href={`/api/orders/${result.orderId}/documents`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ReceiptText aria-hidden />
                  Ver comprobante
                </a>
              </Button>
              <Button variant="ghost" onClick={print} disabled={busy}>
                <Printer aria-hidden />
                {busy ? "Preparando…" : "Imprimir de nuevo"}
              </Button>
            </div>
          ) : null}
          {printStatus ? (
            <p role="status" className="text-sm">
              {printStatus}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      {header}
      <TableRealtimeListener onEvent={onRealtime} />
      <div className="mx-auto grid max-w-6xl items-start gap-0 md:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)] md:gap-8 md:px-6 md:py-8 lg:gap-12">
        <section
          aria-labelledby="account-heading"
          className={cn(
            "px-4 py-6 sm:px-6 md:block md:p-0",
            step === "payment" && "hidden",
          )}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2
              ref={accountHeading}
              tabIndex={-1}
              id="account-heading"
              className="text-lg font-bold"
            >
              Revisar cuenta
            </h2>
            <span className="text-sm text-muted-foreground">
              Cuenta completa
            </span>
          </div>
          <ul className="divide-y border-y">
            {data.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-4">
                <span className="w-7 shrink-0 text-sm tabular-nums">
                  {item.quantity} ×
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold break-words",
                      item.status === "CANCELLED" && "line-through",
                    )}
                  >
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statuses[item.status]}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums">
                  {item.status === "CANCELLED" ? (
                    <s>{formatPrice(item.total)}</s>
                  ) : (
                    formatPrice(item.total)
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between py-5">
            <span className="font-semibold">Total a cobrar</span>
            <strong className="text-2xl tabular-nums">
              {formatPrice(data.total)}
            </strong>
          </div>
          {data.draftCount ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-lg border p-4"
            >
              <p>
                Hay {data.draftCount} productos sin enviar. Vuelve al pedido
                para resolverlos antes de cobrar.
              </p>
              <Button asChild variant="outline">
                <Link href={`/dashboard/tables/${data.tableId}/order`}>
                  Volver al pedido
                </Link>
              </Button>
            </div>
          ) : null}
          {!data.items.length ? (
            <p className="py-6 text-sm text-muted-foreground">
              Agrega y envía productos para cobrar esta cuenta.
            </p>
          ) : null}
          <Button
            className="mt-4 min-h-12 w-full md:hidden"
            disabled={data.draftCount > 0 || data.total <= 0 || closed}
            onClick={() => {
              setStep("payment");
              window.scrollTo(0, 0);
              setTimeout(() => paymentHeading.current?.focus(), 0);
            }}
          >
            Continuar al pago
            <ArrowRight aria-hidden />
          </Button>
        </section>
        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className={cn(
            styles.form,
            "min-w-0 md:block",
            step === "review" && "hidden",
          )}
        >
          <div className="flex flex-col gap-7 bg-card px-4 py-6 sm:px-6 md:rounded-t-xl md:border md:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <h2
                ref={paymentHeading}
                tabIndex={-1}
                className="text-lg font-bold"
              >
                Comprobante y pago
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 md:hidden"
                onClick={() => setStep("review")}
              >
                Ver cuenta
              </Button>
            </div>
            <fieldset disabled={busy} className="min-w-0">
              <legend className="mb-3 text-sm font-bold">Comprobante</legend>
              <ToggleGroup
                type="single"
                value={receipt.documentType}
                onValueChange={(value) => {
                  if (!value) return;
                  setReceipt({
                    documentType: value as TableReceiptInput["documentType"],
                  });
                  if (value === "invoice") {
                    setCustomer((current) => ({
                      ...current,
                      documentType: "RUC",
                    }));
                    setIncludeCustomer(true);
                  }
                  setFieldErrors({});
                }}
                className="grid grid-cols-3 items-stretch gap-2"
                aria-label="Comprobante"
              >
                {data.documents.map((value) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    variant="outline"
                    className="h-auto min-h-12 px-2 py-2 text-sm"
                  >
                    {documentLabels[value]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {receipt.documentType === "receipt" ? (
                <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={includeCustomer}
                    onChange={(event) =>
                      setIncludeCustomer(event.target.checked)
                    }
                    className="size-5 accent-primary"
                  />
                  Agregar datos del cliente
                </label>
              ) : null}
              {receipt.documentType === "invoice" ||
              (receipt.documentType === "receipt" && includeCustomer) ? (
                <div className="mt-5 flex flex-col gap-4">
                  {receipt.documentType === "receipt" ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-type">Tipo de documento</Label>
                      <select
                        id="customer-type"
                        value={customer.documentType}
                        onChange={(event) =>
                          setCustomer({
                            ...customer,
                            documentType: event.target
                              .value as typeof customer.documentType,
                          })
                        }
                        className="min-h-11 rounded-lg border border-input bg-background px-3 text-base"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CARNET_EXTRANJERIA">
                          Carnet de extranjería
                        </option>
                        <option value="RUC">RUC</option>
                      </select>
                    </div>
                  ) : null}
                  {(
                    [
                      [
                        "documentNumber",
                        customer.documentType === "RUC"
                          ? "RUC"
                          : "Número de documento",
                      ],
                      [
                        "legalName",
                        customer.documentType === "RUC"
                          ? "Razón social"
                          : "Nombre completo",
                      ],
                      [
                        "address",
                        receipt.documentType === "invoice"
                          ? "Dirección fiscal"
                          : "Dirección (opcional)",
                      ],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-2">
                      <Label htmlFor={`customer-${key}`}>{label}</Label>
                      <Input
                        id={`customer-${key}`}
                        className="scroll-mt-6 text-base"
                        value={customer[key]}
                        inputMode={
                          key === "documentNumber" &&
                          customer.documentType !== "CARNET_EXTRANJERIA"
                            ? "numeric"
                            : "text"
                        }
                        maxLength={
                          key === "documentNumber"
                            ? customer.documentType === "DNI"
                              ? 8
                              : customer.documentType === "RUC"
                                ? 11
                                : 15
                            : key === "legalName"
                              ? 200
                              : 300
                        }
                        onChange={(event) =>
                          setCustomer({
                            ...customer,
                            [key]: event.target.value,
                          })
                        }
                        aria-invalid={!!fieldErrors[`customer.${key}`]}
                        aria-describedby={
                          fieldErrors[`customer.${key}`]
                            ? `error-${key}`
                            : undefined
                        }
                      />
                      {fieldErrors[`customer.${key}`] ? (
                        <p
                          id={`error-${key}`}
                          role="alert"
                          className="text-sm text-destructive"
                        >
                          {fieldErrors[`customer.${key}`]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </fieldset>
            <fieldset
              disabled={busy || !!data.draftCount || closed}
              className="min-w-0"
            >
              <legend className="mb-3 text-sm font-bold">Medio de pago</legend>
              <ToggleGroup
                type="single"
                value={method === "credit_card" ? "debit_card" : method}
                onValueChange={(value) => {
                  if (value && validateReceipt())
                    setMethod(value as TablePaymentInput["method"]);
                }}
                className="grid grid-cols-2 gap-3"
                aria-label="Medio de pago"
              >
                {[
                  { value: "debit_card", label: "Tarjeta", icon: CreditCard },
                  { value: "wallet", label: "Billetera", icon: Smartphone },
                  ...(canCollectCash
                    ? [
                        { value: "cash", label: "Efectivo", icon: Banknote },
                        { value: "combine", label: "Combinado", icon: Layers },
                      ]
                    : []),
                ].map(({ value, label, icon: Icon }) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    variant="outline"
                    className="flex h-auto min-h-20 flex-col gap-2 py-3"
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {method === "debit_card" || method === "credit_card" ? (
                <ToggleGroup
                  type="single"
                  value={method}
                  aria-label="Tipo de tarjeta"
                  onValueChange={(value) => {
                    if (value) setMethod(value as "debit_card" | "credit_card");
                  }}
                  className="mt-3 justify-start"
                >
                  <ToggleGroupItem value="debit_card" className="min-h-11">
                    Débito
                  </ToggleGroupItem>
                  <ToggleGroupItem value="credit_card" className="min-h-11">
                    Crédito
                  </ToggleGroupItem>
                </ToggleGroup>
              ) : null}
              {!canCollectCash ? (
                <div className="mt-4 border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => {
                      if (validateReceipt()) setMethod("register");
                    }}
                  >
                    Enviar a caja
                    <ArrowRight aria-hidden />
                  </Button>
                  <p className="px-4 text-xs text-muted-foreground">
                    Para efectivo o pago combinado
                  </p>
                </div>
              ) : null}
              {method === "combine" ? (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {Object.entries(contributions).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-2">
                      <Label htmlFor={`amount-${key}`}>
                        {labels[key]} · S/
                      </Label>
                      <Input
                        id={`amount-${key}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={value}
                        onChange={(event) =>
                          setContributions({
                            ...contributions,
                            [key]: event.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                  <p className="col-span-2 text-sm">
                    Por asignar:{" "}
                    <strong>
                      {formatPrice(
                        data.total -
                          Object.values(contributions).reduce(
                            (sum, value) =>
                              sum + Math.round(Number(value) * 100),
                            0,
                          ) /
                            100,
                      )}
                    </strong>
                  </p>
                </div>
              ) : null}
              {needsCash ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Label htmlFor="cash-received">Efectivo recibido · S/</Label>
                  <Input
                    id="cash-received"
                    required
                    type="number"
                    inputMode="decimal"
                    min={cashAmount}
                    step="0.01"
                    value={cashReceived}
                    onChange={(event) => setCashReceived(event.target.value)}
                  />
                  <p className="text-sm">
                    Vuelto:{" "}
                    {formatPrice(
                      Math.max(0, Number(cashReceived) - cashAmount),
                    )}
                  </p>
                </div>
              ) : null}
              {needsWallet ? (
                <div className="mt-4 flex flex-col gap-4">
                  {(
                    [
                      ["name", "Billetera"],
                      ["operationCode", "Código de operación"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-2">
                      <Label htmlFor={`wallet-${key}`}>{label}</Label>
                      <Input
                        id={`wallet-${key}`}
                        required
                        value={wallet[key]}
                        maxLength={key === "name" ? 80 : 100}
                        onChange={(event) =>
                          setWallet({ ...wallet, [key]: event.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </fieldset>
            {!data.cashShift ? (
              <p role="status" className="text-sm">
                No hay una caja compartida abierta. Solicita su apertura en
                caja.
                {!canCollectCash
                  ? " Puedes enviar la cuenta a caja mientras tanto."
                  : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Caja receptora · {data.cashShift.name}
              </p>
            )}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {uncertain ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void refresh()}
              >
                Consultar estado del pago
              </Button>
            ) : null}
            {changed ? (
              <div className="flex flex-col gap-3" role="status">
                <p className="text-sm">
                  La cuenta o la caja se actualizó. Revisa los datos antes de
                  continuar.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setChanged(false);
                    setStep("review");
                    setError("");
                  }}
                >
                  Revisar cuenta actualizada
                </Button>
              </div>
            ) : null}
          </div>
          <footer
            className={cn(
              styles.footer,
              "sticky bottom-0 flex flex-col gap-3 border-t bg-card px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-6 md:rounded-b-xl md:border",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold">Mesa {data.tableLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {method ? labels[method] : "Elige el medio de pago"}
                </p>
              </div>
              <strong className="text-2xl tabular-nums">
                {formatPrice(data.total)}
              </strong>
            </div>
            {pendingInKitchen > 0 ? (
              <div
                className="flex items-start gap-3 rounded-lg bg-[var(--payment-warning-bg)] p-3 text-[var(--payment-warning)]"
                role="note"
                style={
                  {
                    "--payment-warning-bg": "#fff5e5",
                    "--payment-warning": "#825008",
                  } as React.CSSProperties
                }
              >
                <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p className="text-sm">
                  Hay {pendingInKitchen}{" "}
                  {pendingInKitchen === 1 ? "producto" : "productos"} en
                  preparación. Puedes cobrar; siguen pendientes de atención.
                </p>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {method === "register"
                ? "La solicitud no registra un pago ni libera la mesa."
                : "Confirma después de verificar que recibiste el pago."}
            </p>
            <Button
              type="submit"
              className="min-h-12 w-full"
              disabled={
                blocked || !method || (method !== "register" && !data.cashShift)
              }
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Registrando…
                </>
              ) : method === "register" ? (
                "Confirmar envío a caja"
              ) : (
                `Confirmar pago · ${formatPrice(data.total)}`
              )}
            </Button>
          </footer>
        </form>
      </div>
    </main>
  );
}
