"use client";

import { Button } from "@/shared/components/ui/button";
import { Input, MoneyInput } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import * as z from "zod";

import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ProductService, ServiceProductType, Photo } from "@/product/types";
import { createServiceProduct } from "@/product/actions";
import FileUpload from "@/product/components/file-upload/file-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Heading } from "@/shared/components/ui/heading";
import { ServiceProductSchema } from "@/product/schema";
import CategoriesSelector from "@/product/components/category/categories-selector";
import { useToast } from "@/shared/components/ui/use-toast";
import { Category } from "@/category/types";
import { Textarea } from "@/shared/components/ui/textarea";
import { ReloadIcon } from "@radix-ui/react-icons";
import { getCompany } from "@/order/actions";
import CategoriesModal from "@/category/components/category-list-model/category-modal";
import { HelpTooltip } from "@/shared/components/ui/help-tooltip";

type ServiceProductFormValues = z.infer<typeof ServiceProductSchema>;

const transformToProduct = (data: ServiceProductFormValues): ProductService => {
  const product: ProductService = {
    ...data,
    categories: data.categories || [],
    type: ServiceProductType,
    hidden: false,
  };

  return product;
};

interface ServiceProductModalProps {
  open: boolean;
  onClose: () => void;
  onActionPerformed: () => void;
}

export default function ServiceProductModal({
  open,
  onClose,
  onActionPerformed
}: ServiceProductModalProps) {
  const [performingAction, setPerformingAction] = useState(false);
  const { toast } = useToast();

  const form = useForm<ServiceProductFormValues>({
    resolver: zodResolver(ServiceProductSchema),
    defaultValues: {
      companyId: "",
      name: "",
      price: 0,
      description: "",
      sku: "",
      categories: [],
      photos: [],
    },
  });

  useEffect(() => {
    getCompany().then((response) => {
      if (response.success) {
        form.setValue("companyId", response.data.id);
      }
    });
  }, [form]);

  const onSubmit = async (data: ServiceProductFormValues) => {
    setPerformingAction(true);
    try {
      const product = transformToProduct(data);
      const response = await createServiceProduct(product);

      if (response.success) {
        toast({
          description: "Servicio creado con éxito",
        });
        onActionPerformed();
        form.reset({
          companyId: data.companyId,
          name: "",
          price: 0,
          description: "",
          sku: "",
          categories: [],
          photos: [],
        });
        onClose();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Error al registrar el servicio, " + response.message,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Ocurrió un error al crear el servicio",
      });
    } finally {
      setPerformingAction(false);
    }
  };

  const handlePhotosUpdated = async (newPhotos: Photo[]) => {
    form.setValue("photos", newPhotos);
  };

  const handleCategoriesUpdated = async (categories: Category[]) => {
    form.setValue("categories", categories);
  };

  const addCategoryToProduct = async (category: Category) => {
    const productCategories = form.getValues("categories") || [];
    if (productCategories.find((c) => c.id === category.id)) return;

    await handleCategoriesUpdated([...productCategories, category]);
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
        companyId: form.getValues("companyId"),
        name: "",
        price: 0,
        description: "",
        sku: "",
        categories: [],
        photos: [],
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="w-full h-full sm:max-w-[750px] sm:h-[750px] flex flex-col justify-center items-center p-0">
        <ScrollArea className="p-6 w-full">
          <div className="flex items-center justify-between">
            <Heading title="Agregar servicio" />
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mx-auto space-y-8"
            >
              <div className="space-y-4 p-2">
                <FormField
                  control={form.control}
                  name="photos"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FileUpload
                          onChange={handlePhotosUpdated}
                          value={field.value || []}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" placeholder="Nombre del servicio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-12 gap-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem className="col-span-6">
                        <FormLabel>Código de barras</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="off"
                            placeholder="Max 13 dígitos"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem className="col-span-6">
                        <FormLabel>Precio de venta</FormLabel>
                        <FormControl>
                          <MoneyInput
                            autoComplete="off"
                            type="number"
                            placeholder="S/ 0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <div className="flex justify-between items-center gap-4">
                        <CategoriesSelector
                          value={field.value || []}
                          onChange={handleCategoriesUpdated}
                        />
                        <div className="flex items-center gap-2">
                          <CategoriesModal addCategory={addCategoryToProduct} />
                          <HelpTooltip text="Categorías del Servicio" />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Escribe la descripción del servicio aquí."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cerrar
              </Button>
            </DialogClose>
            <Button
              className="btn-success"
              type="button"
              disabled={performingAction}
              onClick={form.handleSubmit(onSubmit)}
            >
              {performingAction ? (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Agregar Servicio"
              )}
            </Button>
          </DialogFooter>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
