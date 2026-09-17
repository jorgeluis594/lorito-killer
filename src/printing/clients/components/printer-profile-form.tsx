"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePrinterAction } from "../actions";
import type { PrinterProfile } from "../types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/components/ui/use-toast";

export function PrinterProfileForm({ printer }: { printer: PrinterProfile }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [profile, setProfile] = useState(printer);

  const save = () =>
    startTransition(async () => {
      const result = await updatePrinterAction(profile);
      if (!result.success) {
        setProfile(printer);
        toast({
          title: "No se pudo actualizar la impresora",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      router.refresh();
    });

  return (
    <div className="grid gap-3 pt-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        Estado
        <Select
          value={profile.status}
          onValueChange={(status: PrinterProfile["status"]) =>
            setProfile((current) => ({ ...current, status }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ACTIVE">Activa</SelectItem>
              <SelectItem value="INACTIVE">Inactiva</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Ancho de papel
        <Select
          value={profile.paperWidth}
          onValueChange={(paperWidth: PrinterProfile["paperWidth"]) =>
            setProfile((current) => ({
              ...current,
              paperWidth,
              columns: paperWidth === "MM58" ? 32 : 42,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="MM58">58 mm</SelectItem>
              <SelectItem value="MM80">80 mm</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Columnas
        <Input
          type="number"
          min={1}
          value={profile.columns}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              columns: Number(event.target.value),
            }))
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Avance antes del corte
        <Input
          type="number"
          min={0}
          value={profile.feedBeforeCut}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              feedBeforeCut: Number(event.target.value),
            }))
          }
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
        Cortar al terminar
        <Switch
          checked={profile.cutEnabled}
          onCheckedChange={(cutEnabled) =>
            setProfile((current) => ({ ...current, cutEnabled }))
          }
        />
      </label>
      <div className="sm:col-span-2">
        <Button variant="outline" onClick={save} disabled={pending}>
          {pending ? "Guardando..." : "Guardar perfil"}
        </Button>
      </div>
    </div>
  );
}
