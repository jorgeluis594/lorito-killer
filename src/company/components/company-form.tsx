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
import * as repository from "@/company/api_repository";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import React from "react";
import { updateCompany } from "@/company/components/actions";
import { Company, Logo } from "@/company/types";
import { useToast } from "@/shared/components/ui/use-toast";
import FileUpload from "@/product/components/file-upload/file-upload";

const IMG_MAX_LIMIT = 1;

const LogoSchema = zod.object({
  id: zod.string().optional(),
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
  logo: zod
    .array(LogoSchema)
    .max(IMG_MAX_LIMIT, { message: "You can only add up to 5 images" })
    .optional(),
});

type CompanyFormValues = zod.infer<typeof CompanyFormSchema>;

export default function CompanyForm({ company }: { company: Company }) {
  const { toast } = useToast();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: { ...company },
  });

  const handleSubmit = async (data: CompanyFormValues) => {
    const response = await updateCompany({ ...company, ...data });

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
    const currentLogos = form.getValues("logo") || [];

    // If the product is new, there is no need to remove the photo from the server
    if (form) return form.setValue("logo", newLogos);

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
        const removeLogoResponse = await repository.removeLogo(
          formStore.company.id!,
          logo.id!,
        );
        if (removeLogoResponse.success) {
          toast({
            description: "Photo eliminada con exito",
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
      const storeLogoResponse = await repository.storeLogos(
        formStore.company.id!,
        logosToAppend,
      );
      if (storeLogoResponse.success) {
        form.setValue("logos", [...currentLogo, ...storeLogoResponse.data]);
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
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FileUpload
                      onChange={handleLogosUpdated}
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
