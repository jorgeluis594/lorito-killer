"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Pencil, ShoppingBag } from "lucide-react";
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
import { openTakeAway, saveTakeAwayCustomerName } from "../actions";
import { CUSTOMER_NAME_MAX } from "../use-cases/normalize-customer-name";
import {
  PASTE_TRUNCATED_HINT,
  SAVED_NAME_TOAST,
  shouldRefreshOnClose,
  submitTakeAwaySheet,
} from "../use-cases/take-away-sheet-flow";
import { truncatePastedName } from "../use-cases/truncate-pasted-name";

export type TakeAwayFormState = {
  name: string;
  /** Edición: el nombre vigente que vio la hoja; tras un conflicto, el que devolvió el servidor. */
  expectedName: string | null;
  truncated: boolean;
  /** Error del campo (rechazo del servidor). */
  fieldError: string;
  /** Duda, rechazo o conflicto mostrados bajo el campo. */
  message: string;
  /** El pedido se cerró o no existe: solo queda volver a Mesas. */
  unavailable: boolean;
  /** Hubo un intento sin respuesta: cerrar la hoja refresca Mesas. */
  uncertain: boolean;
  busy: boolean;
};

export const initialTakeAwayFormState = (
  currentName: string | null,
): TakeAwayFormState => ({
  name: currentName ?? "",
  expectedName: currentName,
  truncated: false,
  fieldError: "",
  message: "",
  unavailable: false,
  uncertain: false,
  busy: false,
});

/** Contenido de la hoja, sin el `Sheet`: se renderiza solo en pruebas e historias. */
export function TakeAwayForm({
  mode,
  state,
  onNameChange,
  onPaste,
  onSubmit,
}: {
  mode: "create" | "edit";
  state: TakeAwayFormState;
  onNameChange: (value: string) => void;
  onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const hintId = "take-away-name-hint";
  const errorId = "take-away-name-error";
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 px-5 pb-5 pt-3"
    >
      <fieldset disabled={state.busy} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="take-away-name">Nombre del cliente</Label>
          <Input
            id="take-away-name"
            className="text-base"
            autoFocus
            autoComplete="off"
            enterKeyHint="go"
            maxLength={CUSTOMER_NAME_MAX}
            value={state.name}
            onChange={(event) => onNameChange(event.target.value)}
            onPaste={onPaste}
            aria-invalid={!!state.fieldError}
            aria-describedby={[state.fieldError ? errorId : null, hintId]
              .filter(Boolean)
              .join(" ")}
          />
          {state.fieldError ? (
            <p id={errorId} className="text-sm text-destructive">
              {state.fieldError}
            </p>
          ) : null}
          <p id={hintId} className="text-xs text-muted-foreground">
            Si lo dejas vacío, se muestra la hora del pedido.
          </p>
          <p
            aria-live="polite"
            className="text-xs text-muted-foreground empty:hidden"
          >
            {state.truncated ? PASTE_TRUNCATED_HINT : ""}
          </p>
        </div>
      </fieldset>
      {state.message ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}
      {state.unavailable ? (
        <Button asChild variant="outline" className="min-h-12 w-full">
          <Link href="/dashboard/tables">Volver a Mesas</Link>
        </Button>
      ) : (
        <Button
          type="submit"
          className="min-h-12 w-full gap-2"
          disabled={state.busy}
        >
          {state.busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {mode === "edit" ? "Guardar nombre" : "Continuar al pedido"}
          {!state.busy && mode === "create" ? <ArrowRight aria-hidden /> : null}
        </Button>
      )}
    </form>
  );
}

/**
 * Hoja del nombre del cliente de un Para llevar. Sin `edit` abre un pedido
 * nuevo (la clave del intento se regenera en cada apertura); con `edit` corrige
 * el nombre de uno abierto.
 */
export function TakeAwaySheet({
  edit,
}: {
  edit?: { sessionId: string; customerName: string | null };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const mode = edit ? "edit" : "create";
  const attemptKey = useRef<string>("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<TakeAwayFormState>(() =>
    initialTakeAwayFormState(edit?.customerName ?? null),
  );

  function onOpenChange(next: boolean) {
    if (state.busy) return;
    if (next) {
      attemptKey.current = crypto.randomUUID();
      setState(initialTakeAwayFormState(edit?.customerName ?? null));
    } else if (shouldRefreshOnClose(state)) router.refresh();
    setOpen(next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.busy) return;
    setState((current) => ({
      ...current,
      busy: true,
      message: "",
      fieldError: "",
    }));
    const outcome = await submitTakeAwaySheet({
      mode,
      sessionId: edit?.sessionId ?? attemptKey.current,
      name: state.name,
      expectedName: state.expectedName,
      openTakeAway,
      saveCustomerName: saveTakeAwayCustomerName,
    });
    if (outcome.kind === "opened") {
      setOpen(false);
      router.push(`/dashboard/tables/delivery/${outcome.sessionId}/order`);
      return;
    }
    if (outcome.kind === "saved") {
      setOpen(false);
      toast({ title: SAVED_NAME_TOAST });
      return;
    }
    setState((current) => ({
      ...current,
      busy: false,
      uncertain: current.uncertain || outcome.kind === "uncertain",
      unavailable: outcome.kind === "unavailable",
      fieldError: outcome.kind === "invalid" ? outcome.message : "",
      message: outcome.kind === "invalid" ? "" : outcome.message,
      expectedName:
        outcome.kind === "conflict"
          ? outcome.currentName
          : current.expectedName,
    }));
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
            aria-label="Editar nombre del cliente"
          >
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button variant="outline" className="gap-2">
            <ShoppingBag aria-hidden />
            Para llevar
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col gap-0 overflow-y-auto rounded-t-xl p-0 pb-[env(safe-area-inset-bottom)] sm:bottom-4 sm:rounded-xl sm:border"
      >
        <SheetHeader className="px-5 pb-2 pt-5 text-left">
          <SheetTitle>
            {edit ? "Nombre del cliente" : "Nuevo pedido para llevar"}
          </SheetTitle>
          <SheetDescription>
            {edit
              ? "Se actualiza en Mesas. Las comandas ya impresas no cambian: usa Reimprimir si cocina necesita el nombre nuevo."
              : "¿A nombre de quién? Así se ve en la tarjeta y en la comanda."}
          </SheetDescription>
        </SheetHeader>
        <TakeAwayForm
          mode={mode}
          state={state}
          onNameChange={(name) =>
            setState((current) => ({ ...current, name, truncated: false }))
          }
          onPaste={(event) => {
            const input = event.currentTarget;
            const pasted = event.clipboardData.getData("text");
            const result = truncatePastedName({
              value: state.name,
              selectionStart: input.selectionStart ?? state.name.length,
              selectionEnd: input.selectionEnd ?? state.name.length,
              pasted,
            });
            if (!result.truncated) return;
            event.preventDefault();
            setState((current) => ({
              ...current,
              name: result.value,
              truncated: true,
            }));
            requestAnimationFrame(() =>
              input.setSelectionRange(result.caret, result.caret),
            );
          }}
          onSubmit={(event) => void submit(event)}
        />
      </SheetContent>
    </Sheet>
  );
}
