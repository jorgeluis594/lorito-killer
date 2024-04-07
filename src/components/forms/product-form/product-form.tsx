"use client";
import * as z from "zod";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Product, Photo } from "@/product/types";
import { EMPTY_PRODUCT } from "@/product/constants";
import * as repository from "@/product/api_repository";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/file-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { ProductSchema } from "@/product/schema";
import CategoriesSelector from "./categories-selector";
import { useToast } from "@/components/ui/use-toast";
import NewCategoryDialog from "@/components/category/new-category-dialog";
import { Category } from "@/category/types";
import {
  addCategoryToProduct as attachCategoryToProduct,
  removeCategoryFromProduct,
} from "@/category/actions";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { Textarea } from "@/components/ui/textarea";

type ProductFormValues = z.infer<typeof ProductSchema>;

interface ProductFormProps {
  initialProduct?: Product | null;
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

export const ProductForm: React.FC<ProductFormProps> = ({
  initialProduct = null,
}) => {
  const title = initialProduct ? "Editar producto" : "Registrar producto";
  const description = initialProduct
    ? "Editar producto."
    : "Registra un nuevo producto";
  const action = initialProduct ? "Guardar cambios" : "Registrar";

  const { categories, setCategories } = useCategoryStore((store) => store);

  const { toast } = useToast();

  const product = initialProduct ? initialProduct : EMPTY_PRODUCT;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product,
  });

  const onSubmit = async (data: ProductFormValues) => {
    if (initialProduct) {
      const res = await repository.update({
        id: product.id,
        ...transformToProduct(data),
      });
      if (res.success) {
        toast({
          description: "Producto actualizado con exito",
        });
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
    if (!initialProduct) return;
    if (productCategories.find((c) => c.id === category.id)) return;

    await handleCategoriesUpdated([...productCategories, category]);
  };

  const onCategoryAdded = async (category: Category) => {
    const categoryFound = categories.find((c) => c.id === category.id);
    if (!categoryFound) {
      setCategories([...categories, category]);
    }

    await addCategoryToProduct(category);
  };

  const handlePhotosUpdated = async (newPhotos: Photo[]) => {
    const currentPhotos = form.getValues("photos") || [];

    // If the product is new, there is no need to remove the photo from the server
    if (!initialProduct || !initialProduct.id)
      return form.setValue("photos", newPhotos);

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
          initialProduct.id as string,
          photo.id as string,
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
        initialProduct.id as string,
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
    if (!initialProduct || !initialProduct.id)
      return form.setValue("categories", categories);

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
          initialProduct.id,
          category.id as string,
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
          initialProduct.id,
          category.id as string,
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
    <>
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
      </div>
      <Separator />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 w-full"
        >
          <div className="md:grid md:grid-cols-4 gap-4">
            <div className="col-span-2 md:grid md:grid-cols-3 gap-4 h-fit">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="off"
                          placeholder="Nombre del producto"
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
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de barras</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
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
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" type="number" {...field} />
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
                      <Input autoComplete="off" type="number" {...field} />
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
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descipción</FormLabel>
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
              </div>
            </div>
            <FormField
              control={form.control}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Categorías</FormLabel>
                    <NewCategoryDialog addCategory={onCategoryAdded} />
                  </div>
                  <CategoriesSelector
                    value={field.value || []}
                    onChange={handleCategoriesUpdated}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="photos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagenes</FormLabel>
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
          <Button className="ml-auto btn-success" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
