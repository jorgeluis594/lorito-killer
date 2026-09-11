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

import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PackageProduct, PackageProductType, Photo } from "@/product/types";
import { EMPTY_PACKAGE_PRODUCT } from "@/product/constants";
import * as repository from "@/product/api_repository";
import FileUpload from "@/product/components/file-upload/file-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { PackageProductSchema } from "@/product/schema";
import CategoriesSelector from "@/product/components/category/categories-selector";
import { useToast } from "@/shared/components/ui/use-toast";
import { Category } from "@/category/types";
import {
  addCategoryToProduct as attachCategoryToProduct,
  removeCategoryFromProduct,
} from "@/category/actions";
import { Textarea } from "@/shared/components/ui/textarea";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useUserSession } from "@/lib/use-user-session";
import ProductItemsSelector from "@/product/components/form/product-items-selector";
import CategoriesModal from "@/category/components/category-list-model/category-modal";

type ProductFormValues = z.infer<typeof PackageProductSchema>;

const getEmptyProductFormValues = (companyId?: string): ProductFormValues => ({
  ...EMPTY_PACKAGE_PRODUCT,
  companyId: companyId || "",
});

const transformToProduct = (
  data: ProductFormValues,
  hidden = false,
): PackageProduct => {
  return {
    companyId: data.companyId,
    preparationStation: data.preparationStation,
    name: data.name,
    price: data.price,
    sku: data.sku,
    type: PackageProductType,
    description: data.description,
    photos: data.photos,
    productItems: data.productItems,
    categories: data.categories || [],
    hidden,
  };
};

interface ProductFormProps {
  onActionPerformed: () => void;
}

const PackageProductModalForm: React.FC<ProductFormProps> = ({
  onActionPerformed,
}) => {
  const formStore = useProductFormStore((store) => store);
  const user = useUserSession();

  if (formStore.productType !== PackageProductType)
    throw new Error("Invalid product type");

  const title = formStore.isNew ? "Agregar pack" : "Editar pack";
  const description = formStore.isNew
    ? "Registra un nuevo pack de productos"
    : "Editar pack de productos.";

  const action = formStore.isNew ? "Agregar pack" : "Guardar cambios";

  const { toast } = useToast();

  // The createdAt and updatedAt fields are not part of the form
  const { createdAt, updatedAt, ...productData } = formStore.product || {};

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(PackageProductSchema),
    defaultValues: formStore.isNew
      ? getEmptyProductFormValues(user?.companyId)
      : productData || EMPTY_PACKAGE_PRODUCT,
  });

  const resetForm = () => {
    form.reset(getEmptyProductFormValues(user?.companyId));
  };

  useEffect(() => {
    if (!formStore.open) return;

    if (formStore.isNew) {
      resetForm();
    } else {
      form.reset(productData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formStore.open, formStore.isNew, formStore.product, user?.companyId]);

  const onSubmit = async (data: ProductFormValues) => {
    formStore.setOpen(false);
    if (!formStore.isNew) {
      const res = await repository.update({
        id: formStore.product.id,
        ...transformToProduct(data, formStore.product.hidden),
      });
      if (res.success) {
        toast({
          description: "Pack actualizado con exito",
        });
        onActionPerformed();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description:
            "Error al actualizar el pack de productos, " + res.message,
        });
      }
    } else {
      const res = await repository.create(transformToProduct(data));
      if (res.success) {
        toast({
          description: "Pack creado con exito",
        });
        onActionPerformed();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description:
            "Error al registrar el pack de productos, " + res.message,
        });
      }
    }

    formStore.resetProduct(PackageProductType);
    resetForm();
  };

  const addCategoryToProduct = async (category: Category) => {
    const productCategories = form.getValues("categories") || [];
    if (productCategories.find((c) => c.id === category.id)) return;

    await onCategoryAdded(category);
  };

  const handlePhotosUpdated = async (newPhotos: Photo[]) => {
    const currentPhotos = form.getValues("photos") || [];

    // If the product is new, there is no need to remove the photo from the server
    if (formStore.isNew) return form.setValue("photos", newPhotos);

    const photosToRemove = currentPhotos.filter(
      (photo: Photo) =>
        !newPhotos.find((newPhoto: Photo) => newPhoto.key === photo.key),
    );
    const photosToAppend = newPhotos.filter(
      (photo: Photo) =>
        !currentPhotos.find(
          (currentPhoto: Photo) => currentPhoto.key === photo.key,
        ),
    );

    if (photosToRemove.length) {
      form.setValue("photos", newPhotos);
      for (const photo of photosToRemove) {
        const removePhotoResponse = await repository.removePhoto(
          formStore.product.id!,
          photo.id!,
        );
        if (removePhotoResponse.success) {
          toast({
            description: "Photo eliminada con exito",
          });
        } else {
          toast({
            title: "Error",
            variant: "destructive",
            description: removePhotoResponse.message,
          });
        }
      }
    }

    if (photosToAppend.length) {
      const storePhotoResponse = await repository.storePhotos(
        formStore.product.id!,
        photosToAppend,
      );
      if (storePhotoResponse.success) {
        form.setValue("photos", [...currentPhotos, ...storePhotoResponse.data]);
        toast({
          description: "Photos subidas con exito",
        });
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: storePhotoResponse.message,
        });
      }
    }
  };

  const onCategoryAdded = async (category: Category) => {
    const currentValues = form.getValues("categories") || [];
    form.setValue("categories", [...currentValues, category]);
    if (formStore.isNew) return;

    const attachCategoryResponse = await attachCategoryToProduct(
      formStore.product.id!,
      category.id!,
    );
    if (attachCategoryResponse.success) {
      toast({
        description: `Categoria ${category.name} agregada con exito`,
      });
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: `Error al agregar la categoria ${category.name}`,
      });
      form.setValue("categories", currentValues);
    }
  };

  const onCategoryRemoved = async (category: Category) => {
    const currentCategories = form.getValues("categories") || [];
    const newCategories = currentCategories.filter(
      (c: Category) => c.id !== category.id,
    );
    form.setValue("categories", newCategories);

    if (formStore.isNew) return;

    const removeCategoryResponse = await removeCategoryFromProduct(
      formStore.product.id!,
      category.id!,
    );
    if (removeCategoryResponse.success) {
      toast({
        description: `Categoria ${category.name} eliminada del producto con exito`,
      });
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: `Error al eliminar la categoria ${category.name}`,
      });
    }
  };

  return (
    <Sheet
      open={formStore.open}
      onOpenChange={(val) => {
        if (!val) {
          resetForm();
          formStore.resetProduct(PackageProductType);
          return;
        }
        formStore.setOpen(true);
      }}
    >
      <SheetContent className="flex h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
        <SheetHeader className="shrink-0 border-b bg-card px-6 py-4 pr-16 text-left sm:px-8 sm:pr-20">
          <SheetTitle className="text-2xl font-bold tracking-tight">
            {title}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              <div className="border-b pb-5">
                <h3 className="mb-3 text-base font-bold">Imágenes</h3>
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
              <div className="flex flex-col gap-4">
                <h3 className="text-base font-bold">Datos generales</h3>
                <PreparationStationField />
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categories"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Categoría</FormLabel>
                        <div className="flex min-w-0 items-start gap-2">
                          <CategoriesSelector
                            value={field.value || []}
                            onCategoryAdded={onCategoryAdded}
                            onCategoryRemoved={onCategoryRemoved}
                          />
                          <CategoriesModal addCategory={addCategoryToProduct} />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
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
                      <FormItem>
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escribe la descripción del producto aqui."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productItems"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ProductItemsSelector
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            className="sm:min-w-40"
            type="button"
            disabled={formStore.performingAction}
            onClick={form.handleSubmit(onSubmit)}
          >
            {formStore.performingAction && (
              <ReloadIcon
                aria-hidden="true"
                className="mr-2 h-4 w-4 animate-spin"
              />
            )}
            {action}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default PackageProductModalForm;
