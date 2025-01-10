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
import React, { useEffect, useState } from "react";
import {
  updateCompany,
  removeLogo,
  storeLogo,
} from "@/company/components/actions";
import { Company, Logo } from "@/company/types";
import { useToast } from "@/shared/components/ui/use-toast";
import LogoUpload from "@/company/components/file-upload/file-upload-logo";

const LogoSchema = zod.object({
  id: zod.string(),
  companyId: zod.string(),
  name: zod.string(),
  size: zod.number(),
  key: zod.string(),
  type: zod.string(),
  url: zod.string(),
  createdAt: zod.date().optional(),
});

const CompanyFormSchema = zod.object({
  name: zod
    .string()
    .optional(),
  subName: zod
    .string()
    .optional(),
  email: zod.string().email({ message: "El email no es válido" }).optional(),
  phone: zod
    .string()
    .optional(),
  ruc: zod.string().length(11, "El ruc debe tener 11 digitos").optional(),
  address: zod
    .string()
    .min(6, { message: "La dirección debe tener al menos 6 caracteres" }),
  department: zod
    .string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" })
    .optional(),
  district: zod
    .string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" })
    .optional(),
  provincial: zod
    .string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" })
    .optional(),
  logo: LogoSchema.optional(),
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

  const handleLogoUpdated = async (newLogo: Logo) => {
    const currentLogo = form.getValues("logo");

    if (currentLogo) {
      form.setValue("logo", newLogo);
      const removeLogoResponse = await removeLogo(company.id!, currentLogo.id!);
      if (removeLogoResponse.success) {
        toast({
          description: "Logo eliminado con éxito",
        });
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: removeLogoResponse.message,
        });
      }
    }

    if (newLogo) {
      const storeLogoResponse = await storeLogo(company.id!, newLogo);
      if (storeLogoResponse.success) {
        form.setValue("logo", storeLogoResponse.data);
        toast({
          description: "Logo actualizado con éxito",
        });
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: storeLogoResponse.message,
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-2">
          <div>
            <FormField
              control={form.control}
              name="logo"
              render={({field}) => (
                <FormItem>
                  <FormControl>
                    <LogoUpload
                      onChange={handleLogoUpdated}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({field}) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Razón social" {...field} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subName"
              render={({field}) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Nombre Comercial</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre Comercial" {...field} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ruc"
              render={({field}) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Ruc</FormLabel>
                  <FormControl>
                    <Input placeholder="ej: 10326545678" {...field} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="district"
                render={({field}) => (
                  <FormItem className="my-2 max-w-sm">
                    <FormLabel>Distrito</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="provincial"
                render={({field}) => (
                  <FormItem className="my-2 max-w-sm">
                    <FormLabel>Provincia</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({field}) => (
                  <FormItem className="my-2 max-w-sm">
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({field}) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección" {...field} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({field}) => (
                <FormItem className="my-2 max-w-sm">
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="Correo electónico" {...field} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({field}) => (
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
                  <FormMessage/>
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
