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
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import type { Zone, TableWithSession } from "../types";
import { TableFormSchema, type TableFormValues } from "../schemas";
import {
  createTableAction,
  updateTableAction,
  deleteTableAction,
} from "../actions";

interface TableConfigFormProps {
  tables: TableWithSession[];
  zones: Zone[];
}

export function TableConfigForm({ tables, zones }: TableConfigFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithSession | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<TableFormValues>({
    resolver: zodResolver(TableFormSchema),
    defaultValues: { number: 1, label: "", capacity: 4, zoneId: "" },
  });

  const handleOpenCreate = () => {
    setEditingTable(null);
    const maxNumber = tables.length > 0
      ? Math.max(...tables.map((t) => t.number))
      : 0;
    form.reset({
      number: maxNumber + 1,
      label: "",
      capacity: 4,
      zoneId: zones[0]?.id || "",
    });
    setOpen(true);
  };

  const handleOpenEdit = (table: TableWithSession) => {
    setEditingTable(table);
    form.reset({
      number: table.number,
      label: table.label || "",
      capacity: table.capacity,
      zoneId: table.zoneId,
    });
    setOpen(true);
  };

  const onSubmit = async (values: TableFormValues) => {
    setLoading(true);
    const result = editingTable
      ? await updateTableAction(editingTable.id, values)
      : await createTableAction(values);
    setLoading(false);

    if (result.success) {
      toast({ title: editingTable ? "Mesa actualizada" : "Mesa creada" });
      setOpen(false);
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleDelete = async (table: TableWithSession) => {
    setLoading(true);
    const result = await deleteTableAction(table.id);
    setLoading(false);
    if (result.success) {
      toast({ title: "Mesa eliminada" });
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const getZoneName = (zoneId: string) =>
    zones.find((z) => z.id === zoneId)?.name || "Sin zona";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Mesas</h3>
        <Button
          size="sm"
          className="gap-1"
          onClick={handleOpenCreate}
          disabled={zones.length === 0}
        >
          <Plus className="h-4 w-4" />
          Nueva mesa
        </Button>
      </div>

      {zones.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Primero crea una zona para poder agregar mesas.
        </p>
      )}

      {tables.length === 0 && zones.length > 0 && (
        <p className="text-sm text-muted-foreground">No hay mesas creadas.</p>
      )}

      {tables.length > 0 && (
        <div className="space-y-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">
                  Mesa {table.number}
                  {table.label && (
                    <span className="ml-1 text-muted-foreground">
                      ({table.label})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getZoneName(table.zoneId)} · Capacidad: {table.capacity}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(table)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(table)}
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
              {editingTable ? "Editar mesa" : "Nueva mesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-number">Numero</Label>
                <Input
                  id="table-number"
                  type="number"
                  {...form.register("number")}
                />
                {form.formState.errors.number && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.number.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-label">Etiqueta</Label>
                <Input
                  id="table-label"
                  placeholder="Ej: VIP-1"
                  {...form.register("label")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-capacity">Capacidad</Label>
                <Input
                  id="table-capacity"
                  type="number"
                  {...form.register("capacity")}
                />
                {form.formState.errors.capacity && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.capacity.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Zona</Label>
                <Select
                  value={form.watch("zoneId")}
                  onValueChange={(v: string) => form.setValue("zoneId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.zoneId && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.zoneId.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {editingTable ? "Guardar cambios" : "Crear mesa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
