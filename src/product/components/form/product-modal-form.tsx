"use client";

import { Button } from "@/components/ui/button";
import { Input, MoneyInput } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as z from "zod";

import { useSymbologyScanner } from "@use-symbology-scanner/react";

import React, { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Product, Photo } from "@/product/types";
import { EMPTY_PRODUCT } from "@/product/constants";
import * as repository from "@/product/api_repository";
import FileUpload from "@/components/file-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Heading } from "@/components/ui/heading";
import { ProductSchema } from "@/product/schema";
import CategoriesSelector from "@/components/forms/product-form/categories-selector";
import { useToast } from "@/components/ui/use-toast";
import NewCategoryDialog from "@/components/category/new-category-dialog";
import { Category } from "@/category/types";
import {
  addCategoryToProduct as attachCategoryToProduct,
  removeCategoryFromProduct,
} from "@/category/actions";
import { Textarea } from "@/components/ui/textarea";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { DialogClose } from "@/components/ui/dialog";
import { ReloadIcon } from "@radix-ui/react-icons";
import { isBarCodeValid } from "@/lib/utils";

type ProductFormValues = z.infer<typeof ProductSchema>;

const transformToProduct = (data: ProductFormValues): Product => {
  return {
    name: data.name,
    price: data.price,
    sku: data.sku,
    purchasePrice: data.purchasePrice,
    description: data.description,
    stock: data.stock,
    photos: data.photos,
    categories: data.categories || [],
  };
};

interface ProductFormProps {
  onActionPerformed: () => void;
}

const ProductModalForm: React.FC<ProductFormProps> = ({
  onActionPerformed,
}) => {
  const formStore = useProductFormStore((store) => store);
  const title = formStore.isNew ? "Agregar producto" : "Editar producto";
  const description = formStore.isNew
    ? "Registra un nuevo producto"
    : "Editar producto.";

  const action = formStore.isNew ? "Agregar Producto" : "Guardar cambios";

  const { toast } = useToast();

  // The createdAt and updatedAt fields are not part of the form
  const { createdAt, updatedAt, ...productData } = formStore.product || {};

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: formStore.isNew
      ? EMPTY_PRODUCT
      : productData || EMPTY_PRODUCT,
  });

  useEffect(() => {
    if (formStore.isNew) {
      form.reset(EMPTY_PRODUCT);
    } else {
      form.reset(productData);
    }
  }, [formStore, form]);

  const onSubmit = async (data: ProductFormValues) => {
    formStore.setOpen(false);
    if (!formStore.isNew) {
      const res = await repository.update({
        id: formStore.product.id,
        ...transformToProduct(data),
      });
      if (res.success) {
        toast({
          description: "Producto actualizado con exito",
        });
        onActionPerformed();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Error al actualizar el producto, " + res.message,
        });
        formStore.resetProduct();
      }
    } else {
      const res = await repository.create(transformToProduct(data));
      if (res.success) {
        toast({
          description: "Producto creado con exito",
        });
        onActionPerformed();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Error al registrar el producto, " + res.message,
        });
        formStore.resetProduct();
      }
    }
  };

  const addCategoryToProduct = async (category: Category) => {
    const productCategories = form.getValues("categories") || [];
    if (formStore.isNew) return;
    if (productCategories.find((c) => c.id === category.id)) return;

    await handleCategoriesUpdated([...productCategories, category]);
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

  const handleCategoriesUpdated = async (categories: Category[]) => {
    const currentCategories = form.getValues("categories") || [];
    // If the product is new, there is no need to remove the category from the server
    if (formStore.isNew) return form.setValue("categories", categories);

    const categoriesToRemove = currentCategories.filter(
      (category: Category) =>
        !categories.find(
          (newCategory: Category) => newCategory.id === category.id,
        ),
    );
    const categoriesToAppend = categories.filter(
      (category: Category) =>
        !currentCategories.find(
          (currentCategory: Category) => currentCategory.id === category.id,
        ),
    );

    if (categoriesToRemove.length) {
      form.setValue("categories", categories);
      for (const category of categoriesToRemove) {
        const removeCategoryReponse = await removeCategoryFromProduct(
          formStore.product.id!,
          category.id!,
        );
        if (removeCategoryReponse.success) {
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
      }
    }

    if (categoriesToAppend.length) {
      form.setValue("categories", [
        ...currentCategories,
        ...categoriesToAppend,
      ]);
      for (const category of categoriesToAppend) {
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
        }
      }
    }
  };

  const handleSymbol = (symbol: any, _matchedSymbologies: any) => {
    if (isBarCodeValid(symbol, 3)) {
      form.setValue("sku", symbol);
    }
  };

  useSymbologyScanner(handleSymbol, {
    target: barcodeInputRef,
    scannerOptions: { maxDelay: 20, suffix: "\n" },
  });

  return (
    <Dialog open={formStore.open} onOpenChange={formStore.setOpen}>
      <DialogContent className="sm:max-w-[750px] sm:h-[800px] w-full flex flex-col justify-center items-center p-0">
        <ScrollArea className="p-6 w-full">
          <div className="flex items-center justify-between">
            <Heading title={title} description={description} />
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mx-auto space-y-8"
            >
              <div className="space-y-4 p-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
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
                            {...{ ...field, ref: undefined }}
                            ref={(e) => {
                              field.ref(e);
                              barcodeInputRef.current = e;
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad</FormLabel>
                        <FormControl>
                          <Input autoComplete="off" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Compra</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio de venta</FormLabel>
                        <FormControl>
                          <Input
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
                        <NewCategoryDialog addCategory={addCategoryToProduct} />
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
              disabled={formStore.performingAction}
              onClick={form.handleSubmit(onSubmit)}
            >
              {formStore.performingAction ? (
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                action
              )}
            </Button>
          </DialogFooter>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModalForm;
