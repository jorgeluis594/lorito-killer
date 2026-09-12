"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PageHeader } from "@/shared/components/ui/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/shared/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { createTablesAction, deleteTableAction } from "../actions";
import { CreateTablesSchema } from "../schemas";
import type { TableConfiguration } from "../types";

interface TableConfigFormProps {
  configuration: TableConfiguration;
  canDelete: boolean;
}

export function TableConfigForm({
  configuration,
  canDelete,
}: TableConfigFormProps) {
  const { tables, nextNumber } = configuration;
  const firstUse = tables.length === 0;
  const router = useRouter();
  const [quantity, setQuantity] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState<
    TableConfiguration["tables"][number] | null
  >(null);
  const [removeError, setRemoveError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const parsed = CreateTablesSchema.safeParse({
    quantity: Number(quantity),
    startNumber: nextNumber,
  });
  const count = parsed.success ? parsed.data.quantity : 0;
  const lastNumber = nextNumber + count - 1;
  const actionText = firstUse ? "Crear" : "Agregar";
  const rangeText =
    count === 1
      ? `Se creará la mesa ${nextNumber}.`
      : `Se crearán las mesas del ${nextNumber} al ${lastNumber}.`;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await createTablesAction(parsed.data);
        if (!result.success) {
          setError(result.message);
          return;
        }
        setQuantity("");
        setNotice(
          count === 1
            ? `Mesa ${result.data.firstNumber} creada.`
            : `Mesas del ${result.data.firstNumber} al ${result.data.lastNumber} creadas.`,
        );
        router.refresh();
        headingRef.current?.focus();
      } catch {
        setError(
          "No pudimos confirmar la creación. Actualiza la página para revisar tus mesas antes de intentar de nuevo.",
        );
      }
    });
  };

  const remove = () => {
    if (!removing || pending) return;
    setRemoveError("");
    startTransition(async () => {
      try {
        const result = await deleteTableAction(removing.id);
        if (!result.success) {
          setRemoveError(result.message);
          return;
        }
        setNotice(
          `Mesa ${removing.number} retirada. Su historial se conserva.`,
        );
        setRemoving(null);
        router.refresh();
      } catch {
        setRemoveError(
          "No pudimos confirmar el cambio. Actualiza la página para revisar la mesa.",
        );
      }
    });
  };

  return (
    <section
      aria-labelledby="table-config-title"
      className="flex min-w-0 flex-col gap-8"
    >
      <PageHeader>
        <PageHeader.Main>
          <PageHeader.Heading>
            <PageHeader.Title
              id="table-config-title"
              ref={headingRef}
              tabIndex={-1}
            >
              Configurar mesas
            </PageHeader.Title>
            <PageHeader.Description>
              {firstUse
                ? "Indica cuántas mesas tienes y las numeraremos por ti."
                : `${tables.length} ${tables.length === 1 ? "mesa configurada" : "mesas configuradas"}.`}
            </PageHeader.Description>
          </PageHeader.Heading>
          {!firstUse ? (
            <PageHeader.Actions>
              <Button variant="outline" asChild>
                <Link href="/dashboard/tables">
                  Ir a atender mesas{" "}
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </PageHeader.Actions>
          ) : null}
        </PageHeader.Main>
      </PageHeader>
      <p
        role="status"
        className={cn("text-sm text-primary", !notice && "sr-only")}
      >
        {notice}
      </p>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        {!firstUse ? (
          <ul
            aria-label="Mesas configuradas"
            className="order-2 divide-y rounded-md border bg-card"
          >
            {tables.map((table) => (
              <li
                key={table.id}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold">Mesa {table.number}</p>
                  {table.label ? (
                    <p className="break-words text-sm text-muted-foreground">
                      {table.label}
                    </p>
                  ) : null}
                  {table.inService ? (
                    <p className="text-sm text-muted-foreground">En atención</p>
                  ) : null}
                </div>
                {canDelete ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Opciones de mesa ${table.number}`}
                        disabled={pending}
                      >
                        <MoreVertical className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          disabled={table.inService}
                          onSelect={() => {
                            setRemoving(table);
                            setRemoveError("");
                          }}
                        >
                          <Trash2 className="mr-2 size-4" aria-hidden="true" />
                          {table.inService
                            ? "En atención: no se puede retirar"
                            : "Retirar mesa"}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <form
          onSubmit={submit}
          noValidate
          aria-busy={pending}
          className="order-1 flex flex-col gap-4"
        >
          {!firstUse ? (
            <h2 className="text-lg font-medium">Agregar mesas</h2>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="table-quantity">Cantidad de mesas</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="w-20 shrink-0 tabular-nums"
                id="table-quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                step={1}
                placeholder={firstUse ? "Ej. 12" : "Ej. 4"}
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setError("");
                }}
                disabled={pending}
                required
                aria-invalid={!!error}
                aria-describedby="table-quantity-help table-quantity-error"
              />
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Guardando…"
                  : count
                    ? `${actionText} ${count} ${count === 1 ? "mesa" : "mesas"}`
                    : `${actionText} mesas`}
              </Button>
            </div>
            <p
              id="table-quantity-help"
              aria-live="polite"
              className="min-h-6 text-sm text-muted-foreground"
            >
              {count ? rangeText : "Ingresa cuántas mesas quieres agregar."}
            </p>
            <p
              id="table-quantity-error"
              role="alert"
              className={cn("text-sm text-destructive", !error && "sr-only")}
            >
              {error}
            </p>
          </div>
        </form>
      </div>
      <AlertDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Retirar la mesa {removing?.number}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de aparecer en el salón. Su historial de atención se
              conserva y las demás mesas mantienen su número.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeError ? (
            <p role="alert" className="text-sm text-destructive">
              {removeError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Conservar mesa
            </AlertDialogCancel>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              {pending ? "Retirando…" : "Retirar mesa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
