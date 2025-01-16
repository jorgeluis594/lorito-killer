"use client";

import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import * as zod from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form";
import React, { useState } from "react";
import { changePassword } from "@/user/actions";
import { useToast } from "@/shared/components/ui/use-toast";

const ChangePasswordFormSchema = zod
  .object({
    currentPassword: zod
      .string()
      .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    newPassword: zod
      .string()
      .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    repeatNewPassword: zod
      .string()
      .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  })
  .refine((data) => data.newPassword === data.repeatNewPassword, {
    message: "Las contraseñas deben coincidir",
    path: ["repeatNewPassword"],
  });

type ChangePasswordFormValues = zod.infer<typeof ChangePasswordFormSchema>;

export default function ChangePasswordForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      repeatNewPassword: "",
    },
  });

  const handleSubmit = async (data: ChangePasswordFormValues) => {
    setLoading(true);
    const response = await changePassword(
      data.currentPassword,
      data.newPassword,
    );
    setLoading(false);
    form.reset();

    if (!response.success && response.message === "Contraseña incorrecta") {
      form.setError("currentPassword", {
        type: "manual",
        message: response.message,
      });
      return;
    } else if (!response.success) {
      toast({
        title: "Error",
        description:
          "No se pudo cambiar la contraseña, reintente en unos minutos",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Contraseña cambiada",
      description: "La contraseña ha sido cambiada",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-2">
          <div>
            <Label>Cambiar contraseña</Label>
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem className="my-2 max-w-sm">
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Contraseña actual"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="my-2 max-w-sm">
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Nueva contraseña"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repeatNewPassword"
              render={({ field }) => (
                <FormItem className="my-2 max-w-sm">
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Repite nueva contraseña"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" size="sm">
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Form>
  );
}
