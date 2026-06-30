"use client";

import { Save, UserPlus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useToast } from "@/shared/components/ui/use-toast";
import { createSeller, updateSellerCode } from "@/seller/actions";
import type { Seller } from "@/seller/types";

const createSellerSchema = z.object({
  email: z.string().email("Ingrese un email valido"),
  password: z
    .string()
    .min(6, "La contrasena debe tener al menos 6 caracteres"),
  name: z.string().optional(),
});

type CreateSellerFormValue = z.infer<typeof createSellerSchema>;

type SellerSettingsProps = {
  sellers: Seller[];
};

export function SellerSettings({ sellers }: SellerSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(sellers);
  const [open, setOpen] = useState(false);
  const [draftCodes, setDraftCodes] = useState<Record<string, string>>(
    Object.fromEntries(sellers.map((seller) => [seller.id, seller.sellerCode])),
  );
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [pendingSellerId, setPendingSellerId] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const [, startUpdateTransition] = useTransition();

  const form = useForm<CreateSellerFormValue>({
    resolver: zodResolver(createSellerSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return (a.name || a.email).localeCompare(b.name || b.email);
      }),
    [items],
  );

  const handleCreateSeller = (data: CreateSellerFormValue) => {
    startCreateTransition(async () => {
      const response = await createSeller(data);

      if (!response.success) {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
        return;
      }

      setItems((currentItems) => [...currentItems, response.data]);
      setDraftCodes((currentCodes) => ({
        ...currentCodes,
        [response.data.id]: response.data.sellerCode,
      }));
      form.reset();
      setOpen(false);
      toast({
        title: "Seller creado",
        description: `Codigo asignado: ${response.data.sellerCode}`,
      });
      router.refresh();
    });
  };

  const handleCodeChange = (sellerId: string, sellerCode: string) => {
    const normalizedCode = sellerCode.replace(/\D/g, "").slice(0, 4);
    setDraftCodes((currentCodes) => ({
      ...currentCodes,
      [sellerId]: normalizedCode,
    }));
    setRowErrors((currentErrors) => ({ ...currentErrors, [sellerId]: "" }));
  };

  const handleUpdateSellerCode = (seller: Seller) => {
    const sellerCode = draftCodes[seller.id] ?? "";
    if (!/^\d{4}$/.test(sellerCode)) {
      setRowErrors((currentErrors) => ({
        ...currentErrors,
        [seller.id]: "El codigo debe tener exactamente 4 digitos",
      }));
      return;
    }

    setPendingSellerId(seller.id);
    startUpdateTransition(async () => {
      const response = await updateSellerCode({
        sellerId: seller.id,
        sellerCode,
      });
      setPendingSellerId(null);

      if (!response.success) {
        setRowErrors((currentErrors) => ({
          ...currentErrors,
          [seller.id]: response.message,
        }));
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
      setDraftCodes((currentCodes) => ({
        ...currentCodes,
        [response.data.id]: response.data.sellerCode,
      }));
      toast({
        title: "Codigo actualizado",
        description: "El codigo del seller fue guardado.",
      });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Crear seller
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear seller</DialogTitle>
              <DialogDescription>
                Crea un usuario vendedor con codigo automatico de 4 digitos.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCreateSeller)}
                className="flex flex-col gap-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre opcional"
                          disabled={isCreating}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seller@empresa.com"
                          disabled={isCreating}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contrasena</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          disabled={isCreating}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isCreating}>
                    Crear
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[180px]">Codigo</TableHead>
            <TableHead className="w-[92px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                No hay sellers creados.
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map((seller) => {
              const draftCode = draftCodes[seller.id] ?? "";
              const hasChanges = draftCode !== seller.sellerCode;
              const isPending = pendingSellerId === seller.id;

              return (
                <TableRow key={seller.id}>
                  <TableCell className="font-medium">
                    {seller.name || "Sin nombre"}
                  </TableCell>
                  <TableCell>{seller.email}</TableCell>
                  <TableCell>
                    <Badge variant={seller.active ? "default" : "secondary"}>
                      {seller.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Input
                        value={draftCode}
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        maxLength={4}
                        disabled={isPending}
                        aria-invalid={Boolean(rowErrors[seller.id])}
                        onChange={(event) =>
                          handleCodeChange(seller.id, event.target.value)
                        }
                      />
                      {rowErrors[seller.id] && (
                        <p className="text-xs text-destructive">
                          {rowErrors[seller.id]}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!hasChanges || isPending}
                      onClick={() => handleUpdateSellerCode(seller)}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Guardar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
