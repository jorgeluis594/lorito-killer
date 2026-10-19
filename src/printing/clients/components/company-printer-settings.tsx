"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from "@/shared/components/ui/use-toast";
import { setCompanyPrinterAction } from "../actions";

type PrinterOption = {
  id: string;
  localName: string;
  status: "ACTIVE" | "INACTIVE";
};

export function CompanyPrinterSettings({
  currentPrinterId,
  printers,
}: {
  currentPrinterId: string | null;
  printers: PrinterOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [printerId, setPrinterId] = useState(currentPrinterId ?? "none");

  const save = () =>
    startTransition(async () => {
      const result = await setCompanyPrinterAction({
        printerId: printerId === "none" ? null : printerId,
      });
      if (!result.success) {
        setPrinterId(currentPrinterId ?? "none");
        toast({
          title: "No se pudo guardar la impresora",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      router.refresh();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Impresora de caja</CardTitle>
        <CardDescription>Impresora asociada a la caja.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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
                      printer.status === "ACTIVE" || printer.id === printerId,
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
        <Button
          onClick={save}
          disabled={pending || printerId === (currentPrinterId ?? "none")}
        >
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </CardContent>
    </Card>
  );
}
