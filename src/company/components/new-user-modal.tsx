"use client";

import { User } from "lucide-react";
import { useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import { createUser } from "@/user/actions";
import { useUserSession } from "@/lib/use-user-session";
import { useToast } from "@/shared/components/ui/use-toast";
import { USER_ROLES, ROLE_LABELS } from "@/authorization/types";
import type { UserRole } from "@/authorization/types";
import { useFeatureEnabled } from "@/feature-flags/client";

const RESTAURANT_ROLES: UserRole[] = ["WAITER", "KITCHEN", "BARTENDER"];

const userFormSchema = z
  .object({
    email: z.string().email({ message: "Ingrese un email valido" }),
    password: z
      .string()
      .min(6, { message: "La contrasena debe tener al menos 6 caracteres" }),
    repeatPassword: z.string(),
    role: z.enum(USER_ROLES, {
      required_error: "Selecciona un rol",
    }),
  })
  .refine((data) => data.repeatPassword === data.password, {
    message: "Las contrasenas deben coincidir",
    path: ["repeatPassword"],
  });

type UserFormValue = z.infer<typeof userFormSchema>;

export default function NewUserModal() {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const user = useUserSession();
  const restaurantsEnabled = useFeatureEnabled("restaurants");
  const availableRoles = USER_ROLES.filter(
    (role) => restaurantsEnabled || !RESTAURANT_ROLES.includes(role),
  );
  const form = useForm<UserFormValue>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      password: "",
      repeatPassword: "",
      role: "CASHIER",
    },
  });

  const onSubmit = async (data: UserFormValue) => {
    setLoading(true);
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesion",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    const response = await createUser(
      user.companyId,
      data.email,
      data.password,
      data.role as UserRole,
    );

    setLoading(false);

    if (!response.success && response.message === "El usuario ya existe") {
      form.setError("email", {
        type: "manual",
        message: response.message,
      });
      return;
    }

    if (!response.success) {
      toast({
        title: "Error",
        description: response.message || "No se pudo crear el usuario, intente en unos minutos",
        variant: "destructive",
      });
      return;
    }

    form.reset();
    toast({
      title: "Usuario creado",
      description: `Usuario creado como ${ROLE_LABELS[data.role as UserRole]}`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <User className="h-4 w-4 mr-2" /> Agregar usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Usuario</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario para tu empresa y asignale un rol.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 w-full"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Ingresa el email"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input type="password" disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repeatPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repite contrasena</FormLabel>
                  <FormControl>
                    <Input type="password" disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                disabled={loading}
                className="ml-auto w-full mt-6"
                type="submit"
              >
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
