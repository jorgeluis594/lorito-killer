"use client";

import { User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const userFormSchema = z
  .object({
    email: z.string().email({ message: "Ingrese un email válido" }),
    password: z
      .string()
      .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    repeatPassword: z.string(),
  })
  .refine((data) => data.repeatPassword === data.password, {
    message: "Las contraseñas deben coincidir",
    path: ["repeatPassword"],
  });

type UserFormValue = z.infer<typeof userFormSchema>;

export default function NewUserModal() {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm<UserFormValue>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: UserFormValue) => {
    console.log({ data });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <User className="h-4 w-4 mr-2" /> Agregar usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
                      placeholder="Ingresa tu email"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
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
                  <FormLabel>Repite contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={loading}
              className="ml-auto w-full mt-6"
              type="submit"
            >
              Registrarse
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
