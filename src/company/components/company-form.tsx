"use client";

import * as zod from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import React from "react";
import { updateCompany } from "@/company/components/actions";
import { Company } from "@/company/types";
import { useToast } from "@/shared/components/ui/use-toast";

const CompanyFormSchema = zod.object({
  name: zod
    .string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
  email: zod.string().email({ message: "El email no es válido" }),
  phone: zod
    .string()
    .min(6, { message: "El teléfono debe tener al menos 6 caracteres" }),
  ruc: zod.string().length(11, "El ruc debe tener 11 digitos").optional(),
  address: zod
    .string()
    .min(6, { message: "La dirección debe tener al menos 6 caracteres" }),
});

type CompanyFormValues = zod.infer<typeof CompanyFormSchema>;

export default function CompanyForm({ company }: { company: Company }) {
  const { toast } = useToast();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: { ...company },
  });

  const handleSubmit = async (data: CompanyFormValues) => {
    const response = await updateCompany({
      ...company,
      ...data,
      ruc: data["ruc"],
    });

    if (!response.success) {
      toast({
        title: "Error",
        description:
          "No se pudo actualizar la empresa, intentalo en unos minutos",
        variant: "destructive",
      });
      return;
    } else {
      toast({
        title: "Empresa actualizada",
        description: "Los datos de la empresa han sido actualizados",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-2">
          <div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Razón social" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ruc"
              render={({ field }) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Ruc</FormLabel>
                  <FormControl>
                    <Input placeholder="10712432876" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      max={999999999}
                      placeholder="Teléfono"
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
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="Correo electónico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" size="sm">
            Actualizar datos
          </Button>
        </div>
      </form>
    </Form>
  );
}
