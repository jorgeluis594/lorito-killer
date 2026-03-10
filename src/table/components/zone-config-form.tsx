"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import type { Zone } from "../types";
import { ZoneFormSchema, type ZoneFormValues } from "../schemas";
import {
  createZoneAction,
  updateZoneAction,
  deleteZoneAction,
} from "../actions";

interface ZoneConfigFormProps {
  zones: Zone[];
}

export function ZoneConfigForm({ zones }: ZoneConfigFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(ZoneFormSchema),
    defaultValues: { name: "", order: 0 },
  });

  const handleOpenCreate = () => {
    setEditingZone(null);
    form.reset({ name: "", order: zones.length });
    setOpen(true);
  };

  const handleOpenEdit = (zone: Zone) => {
    setEditingZone(zone);
    form.reset({ name: zone.name, order: zone.order });
    setOpen(true);
  };

  const onSubmit = async (values: ZoneFormValues) => {
    setLoading(true);
    const result = editingZone
      ? await updateZoneAction(editingZone.id, values)
      : await createZoneAction(values);
    setLoading(false);

    if (result.success) {
      toast({ title: editingZone ? "Zona actualizada" : "Zona creada" });
      setOpen(false);
      form.reset();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleDelete = async (zone: Zone) => {
    setLoading(true);
    const result = await deleteZoneAction(zone.id);
    setLoading(false);
    if (result.success) {
      toast({ title: "Zona eliminada" });
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Zonas</h3>
        <Button size="sm" className="gap-1" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" />
          Nueva zona
        </Button>
      </div>

      {zones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay zonas. Crea una zona para empezar a agregar mesas.
        </p>
      ) : (
        <div className="space-y-2">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{zone.name}</p>
                <p className="text-xs text-muted-foreground">
                  Orden: {zone.order}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(zone)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(zone)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingZone ? "Editar zona" : "Nueva zona"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Nombre</Label>
              <Input
                id="zone-name"
                placeholder="Ej: Salon Principal"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-order">Orden</Label>
              <Input
                id="zone-order"
                type="number"
                {...form.register("order")}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {editingZone ? "Guardar cambios" : "Crear zona"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
