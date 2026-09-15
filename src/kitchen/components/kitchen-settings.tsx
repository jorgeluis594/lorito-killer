"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createKitchenAction, updateKitchenAction } from "../actions";
import type { Kitchen } from "../types";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from "@/shared/components/ui/use-toast";

type PrinterOption = {
  id: string;
  localName: string;
  status: "ACTIVE" | "INACTIVE";
};

function KitchenForm({
  kitchen,
  printers,
  usedPrinterIds,
}: {
  kitchen?: Kitchen;
  printers: PrinterOption[];
  usedPrinterIds: Set<string>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(kitchen?.name ?? "");
  const [status, setStatus] = useState(kitchen?.status ?? "ACTIVE");
  const [printerId, setPrinterId] = useState(kitchen?.printerId ?? "none");

  const save = () =>
    startTransition(async () => {
      const input = {
        id: kitchen?.id,
        name,
        status,
        printerId: printerId === "none" ? null : printerId,
      };
      const result = kitchen
        ? await updateKitchenAction(input)
        : await createKitchenAction(input);
      if (!result.success) {
        if (kitchen) {
          setName(kitchen.name);
          setStatus(kitchen.status);
          setPrinterId(kitchen.printerId ?? "none");
        }
        toast({
          title: "No se pudo guardar la Kitchen",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      if (!kitchen) {
        setName("");
        setPrinterId("none");
      }
      router.refresh();
    });

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Impresora
        <Select value={printerId} onValueChange={setPrinterId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="none">Sin configurar</SelectItem>
              {printers
                .filter(
                  (printer) =>
                    printer.status === "ACTIVE" &&
                    (!usedPrinterIds.has(printer.id) ||
                      printer.id === printerId),
                )
                .map((printer) => (
                  <SelectItem key={printer.id} value={printer.id}>
                    {printer.localName}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
      {kitchen ? (
        <Select
          value={status}
          onValueChange={(value: "ACTIVE" | "INACTIVE") => setStatus(value)}
        >
          <SelectTrigger aria-label="Estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ACTIVE">Activa</SelectItem>
              <SelectItem value="INACTIVE">Inactiva</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}
      <Button onClick={save} disabled={pending || name.trim().length < 2}>
        {pending ? "Guardando..." : kitchen ? "Guardar" : "Crear Kitchen"}
      </Button>
    </div>
  );
}

export function KitchenSettings({
  kitchens,
  printers,
}: {
  kitchens: Kitchen[];
  printers: PrinterOption[];
}) {
  const usedPrinterIds = new Set(
    kitchens.flatMap((kitchen) =>
      kitchen.printerId ? [kitchen.printerId] : [],
    ),
  );
  return (
    <section className="flex flex-col gap-4" aria-labelledby="kitchens-title">
      <div>
        <h4 id="kitchens-title" className="font-semibold">
          Destinos de preparación
        </h4>
        <p className="text-sm text-muted-foreground">
          Asigna una impresora opcional a cada Kitchen.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva Kitchen</CardTitle>
        </CardHeader>
        <CardContent>
          <KitchenForm printers={printers} usedPrinterIds={usedPrinterIds} />
        </CardContent>
      </Card>
      {kitchens.map((kitchen) => (
        <Card key={kitchen.id}>
          <CardContent className="pt-6">
            <KitchenForm
              kitchen={kitchen}
              printers={printers}
              usedPrinterIds={usedPrinterIds}
            />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
