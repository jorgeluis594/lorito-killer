"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as z from "zod";

import React from "react";
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

type ProductFormValues = z.infer<typeof ProductSchema>;

interface ProductFormProps {
  open: boolean;
  setOpen: (val: boolean) => void;
}

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

const ProductModalForm: React.FC<ProductFormProps> = ({ open, setOpen }) => {
  const formStore = useProductFormStore((store) => store);
  const title = formStore.isNew ? "Agregar producto" : "Editar producto";
  const description = formStore.isNew
    ? "Registra un nuevo producto"
    : "Editar producto.";

  const action = formStore.isNew ? "Agregar Producto" : "Guardar cambios";

  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: formStore.isNew ? EMPTY_PRODUCT : formStore.product,
  });

  const onSubmit = async (data: ProductFormValues) => {
    if (!formStore.isNew) {
      const res = await repository.update({
        id: formStore.product.id,
        ...transformToProduct(data),
      });
      if (res.success) {
        toast({
          description: "Producto actualizado con exito",
        });
        // setOpen(false);
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Error al actualizar el producto, " + res.message,
        });
      }
    } else {
      const res = await repository.create(transformToProduct(data));
      if (res.success) {
        toast({
          description: "Producto creado con exito",
        });
        // setOpen(false);
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Error al registrar el producto, " + res.message,
        });
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

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[525px] sm:h-[700px] w-full flex flex-col justify-center items-center p-0">
        <ScrollArea className="p-6">
          <div className="flex items-center justify-between">
            <Heading title={title} description={description} />
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="max-w-md mx-auto space-y-8"
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
                            {...field}
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
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Compra</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="purchasePrice"
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
              <div className="flex justify-center">
                <Button className="btn-success" type="submit">
                  {action}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModalForm;
