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
import React, {useEffect, useState} from "react";
import {updateCompany, removeLogo, storeLogos, getLogo} from "@/company/components/actions";
import { Company, Logo } from "@/company/types";
import { useToast } from "@/shared/components/ui/use-toast";
import LogoUpload from "@/company/components/file-upload/file-upload-logo";
import {useLogoStore} from "@/company/logo-store-provider";
import {getMany as getManyProducts} from "@/product/api_repository";

const IMG_MAX_LIMIT = 1;

const LogoSchema = zod.object({
  id: zod.string(),
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
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
  email: zod.string().email({ message: "El email no es válido" }),
  phone: zod
    .string()
    .min(6, { message: "El teléfono debe tener al menos 6 caracteres" }),
  address: zod
    .string()
    .min(6, { message: "La dirección debe tener al menos 6 caracteres" }),
  logos: zod
    .array(LogoSchema)
    .max(IMG_MAX_LIMIT)
    .optional(),
});

type CompanyFormValues = zod.infer<typeof CompanyFormSchema>;

export default function CompanyForm({ company }: { company: Company }) {
  const { toast } = useToast();
  const {setLogos} = useLogoStore((store) => store);
  const logos = useLogoStore((store) => store.logos)

  const fetchLogos = async () => {
    const response = await getLogo(company.id);

    if (response.success) {
      setLogos(response.data);
    }
  };

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: { ...company },
  });

  const handleSubmit = async (data: CompanyFormValues) => {
    const { logos, ...dataStore} = data
    const response = await updateCompany({ ...company, ...dataStore }); //, logo: data.logos ? data.logos![0] : undefined

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

  const handleLogosUpdated = async (newLogos: Logo[]) => {
    const currentLogos = form.getValues("logos") || [];
    const logosToRemove = currentLogos.filter(
      (logo: Logo) =>
        !newLogos.find((newLogo: Logo) => newLogo.key === logo.key),
    );
    const logosToAppend = newLogos.filter(
      (logo: Logo) =>
        !currentLogos.find(
          (currentLogo: Logo) => currentLogo.key === logo.key,
        ),
    );

    if (logosToRemove.length) {
      form.setValue("logos", newLogos);
      for (const logo of logosToRemove) {
        const removeLogoResponse = await removeLogo(
          company.id!,
          logo.id!,
        );
        if (removeLogoResponse.success) {
          toast({
            description: "Logo eliminada con exito",
          });
        } else {
          toast({
            title: "Error",
            variant: "destructive",
            description: removeLogoResponse.message,
          });
        }
      }
    }

    if (logosToAppend.length) {
      const storeLogoResponse = await storeLogos(
        company.id!,
        logosToAppend,
      );
      if (storeLogoResponse.success) {
        form.setValue("logos", [...currentLogos, ...storeLogoResponse.data]);
        toast({
          description: "Logos subidas con exito",
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

  useEffect(() => {
    fetchLogos()
    form.setValue('logos', logos);
  }, [logos, form]);

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
            <FormField
              control={form.control}
              name="logos"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LogoUpload
                      onChange={ handleLogosUpdated }
                      value={field.value || []}
                    />
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