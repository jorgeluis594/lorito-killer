"use client";

import { PreparationStationField } from "./preparation-station-field";

import { Button } from "@/shared/components/ui/button";
import { Input, MoneyInput } from "@/shared/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetHeader,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import * as z from "zod";

import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  DishProduct,
  DishProductType,
  ProductService,
  ServiceProductType,
  Photo,
} from "@/product/types";
import { create, update } from "@/product/api_repository";
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
import { DishProductSchema } from "@/product/schema";
import CategoriesSelector from "@/product/components/category/categories-selector";
import { useToast } from "@/shared/components/ui/use-toast";
import { Category } from "@/category/types";
import { Textarea } from "@/shared/components/ui/textarea";
import { ReloadIcon } from "@radix-ui/react-icons";
import { getCompany } from "@/order/actions";
import CategoriesModal from "@/category/components/category-list-model/category-modal";
import { HelpTooltip } from "@/shared/components/ui/help-tooltip";
import { getKitchenOptions } from "@/kitchen/actions";
import type { KitchenOption } from "@/kitchen/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type ServiceProductFormValues = z.infer<typeof DishProductSchema>;

const transformToProduct = (
  data: ServiceProductFormValues,
  isDish: boolean,
): ProductService | DishProduct => {
  const product: ProductService | DishProduct = {
    ...data,
    categories: data.categories || [],
    type: isDish ? DishProductType : ServiceProductType,
    kitchenId: isDish ? data.kitchenId || null : null,
    hidden: false,
  };

  return product;
};

interface ServiceProductModalProps {
  product?: ProductService | DishProduct;
  kind?: "service" | "dish";
  open: boolean;
  onClose: () => void;
  onActionPerformed: () => void;
}

export default function ServiceProductModal({
  product: existingProduct,
  kind = "service",
  open,
  onClose,
  onActionPerformed,
}: ServiceProductModalProps) {
  const isDish = kind === "dish" || existingProduct?.type === DishProductType;
  const [performingAction, setPerformingAction] = useState(false);
  const [kitchens, setKitchens] = useState<KitchenOption[]>([]);
  const { toast } = useToast();

  const form = useForm<ServiceProductFormValues>({
    resolver: zodResolver(DishProductSchema),
    defaultValues: existingProduct
      ? { ...existingProduct, createdAt: undefined, updatedAt: undefined }
      : {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDish || !open) return;
    getKitchenOptions().then((result) => {
      if (result.success) setKitchens(result.data);
    });
  }, [isDish, open]);

  const onSubmit = async (data: ServiceProductFormValues) => {
    setPerformingAction(true);
    try {
      const product = transformToProduct(data, isDish);
      const response = existingProduct
        ? await update({
            ...product,
            id: existingProduct.id,
            hidden: existingProduct.hidden,
          })
        : isDish
          ? await create(product)
          : await createServiceProduct(product as ProductService);

      if (response.success) {
        toast({
          description: existingProduct
            ? `${isDish ? "Plato" : "Servicio"} actualizado con éxito`
            : `${isDish ? "Plato" : "Servicio"} creado con éxito`,
        });
        onActionPerformed();
        form.reset({
          preparationStation: null,
          companyId: data.companyId,
          name: "",
          price: 0,
          description: "",
          sku: "",
          categories: [],
          photos: [],
          kitchenId: null,
        });
        onClose();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: `Error al registrar el ${isDish ? "plato" : "servicio"}, ${response.message}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        variant: "destructive",
        description: `Ocurrió un error al crear el ${isDish ? "plato" : "servicio"}`,
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

  const handleSheetChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
        preparationStation: null,
        companyId: form.getValues("companyId"),
        name: "",
        price: 0,
        description: "",
        sku: "",
        categories: [],
        photos: [],
        kitchenId: null,
      });
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetChange}>
      <SheetContent className="flex h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
        <SheetHeader className="shrink-0 border-b bg-card px-6 py-4 pr-16 text-left sm:px-8 sm:pr-20">
          <SheetTitle className="text-2xl font-bold tracking-tight">
            {existingProduct
              ? `Editar ${isDish ? "plato" : "servicio"}`
              : `Agregar ${isDish ? "plato" : "servicio"}`}
          </SheetTitle>
          <SheetDescription>
            {existingProduct
              ? `Actualiza los datos y el precio del ${isDish ? "plato" : "servicio"}.`
              : `Registra los datos y el precio del ${isDish ? "plato" : "servicio"}.`}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-4">
                <h3 className="text-base font-bold">Datos generales</h3>
                {isDish ? (
                  <FormField
                    control={form.control}
                    name="kitchenId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destino de preparación</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(value) =>
                            field.onChange(value === "none" ? null : value)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sin destino" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="none">Sin destino</SelectItem>
                              {kitchens.map((kitchen) => (
                                <SelectItem key={kitchen.id} value={kitchen.id}>
                                  {kitchen.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <PreparationStationField />
                )}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="off"
                          placeholder={`Nombre del ${isDish ? "plato" : "servicio"}`}
                          {...field}
                        />
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
                      <FormItem className="col-span-12 sm:col-span-6">
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
                      <FormItem className="col-span-12 sm:col-span-6">
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
                      <div className="flex min-w-0 items-start gap-2">
                        <CategoriesSelector
                          value={field.value || []}
                          onChange={handleCategoriesUpdated}
                        />
                        <div className="flex items-center gap-2">
                          <CategoriesModal addCategory={addCategoryToProduct} />
                          <HelpTooltip
                            text={`Categorías del ${isDish ? "Plato" : "Servicio"}`}
                          />
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
                          placeholder={`Escribe la descripción del ${isDish ? "plato" : "servicio"} aquí.`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="border-t pt-5">
                  <h3 className="mb-4 text-base font-bold">Imágenes</h3>
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
                </div>
              </div>
            </form>
          </Form>
        </div>
        <SheetFooter className="shrink-0 flex-row items-center justify-end gap-3 border-t bg-card px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:space-x-0">
          <SheetClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </SheetClose>
          <Button
            className="min-w-40"
            type="button"
            disabled={performingAction}
            onClick={form.handleSubmit(onSubmit)}
          >
            {performingAction && (
              <ReloadIcon
                aria-hidden="true"
                className="mr-2 h-4 w-4 animate-spin"
              />
            )}
            {existingProduct
              ? "Guardar cambios"
              : `Agregar ${isDish ? "plato" : "servicio"}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
