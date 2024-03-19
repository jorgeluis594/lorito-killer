"use client";
import * as z from "zod";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
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

type ProductFormValues = z.infer<typeof ProductSchema>;

interface ProductFormProps {
  initialProduct?: Product | null;
  categories: Category[];
}

const transformToProduct = (data: ProductFormValues): Product => {
  return {
    name: data.name,
    price: data.price,
    sku: data.sku,
    stock: data.stock,
    photos: data.photos,
    categories: data.categories || [],
  };
};

export const ProductForm: React.FC<ProductFormProps> = ({
  initialProduct = null,
  categories,
}) => {
  const title = initialProduct ? "Editar producto" : "Registrar producto";
  const description = initialProduct
    ? "Editar producto."
    : "Registra un nuevo producto";
  const action = initialProduct ? "Guardar cambios" : "Registrar";

  const { toast } = useToast();
  const [availableCategories, setAvailableCategories] =
    useState<Category[]>(categories);

  const product = initialProduct ? initialProduct : EMPTY_PRODUCT;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product,
  });

  const onSubmit = async (data: ProductFormValues) => {
    if (initialProduct) {
      await repository.update({ id: product.id, ...transformToProduct(data) });
    } else {
      await repository.create(transformToProduct(data));
    }
  };

  const addCategoryToProduct = async (category: Category) => {
    const productCategories = form.getValues("categories") || [];
    if (!initialProduct) return;
    if (productCategories.find((c) => c.id === category.id)) return;

    handleCategoriesUpdated([...productCategories, category]);
  };

  const onCategoryAdded = (category: Category) => {
    const categoryFound = availableCategories.find((c) => c.id === category.id);
    if (!categoryFound) {
      setAvailableCategories([...availableCategories, category]);
    }

    addCategoryToProduct(category);
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
        const { success, message } = await repository.removePhoto(
          initialProduct.id as string,
          photo.id as string,
        );
        if (!success) {
          // TODO: toast is not working, fix it
          toast({
            title: "Error",
            variant: "destructive",
            description: message,
          });
        }
      }
    }

    if (photosToAppend.length) {
      const { success, message, data } = await repository.storePhotos(
        initialProduct.id as string,
        photosToAppend,
      );
      if (success) {
        form.setValue("photos", [...currentPhotos, ...(data as Photo[])]);
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: message,
        });
      }
    }
  };

  const handleCategoriesUpdated = async (categories: Category[]) => {
    const currentCategories = form.getValues("categories") || [];
    // If the product is new, there is no need to remove the category from the server
    if (!initialProduct || !initialProduct.id) return;

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
        const { success, message } = await removeCategoryFromProduct(
          initialProduct.id,
          category.id as string,
        );
        if (!success) {
          toast({
            title: "Error",
            variant: "destructive",
            description: message,
          });
        }
      }
    }

    if (categoriesToAppend.length) {
      for (const category of categoriesToAppend) {
        const {
          success,
          message,
          data: createdCategory,
        } = await attachCategoryToProduct(
          initialProduct.id,
          category.id as string,
        );
        if (success) {
          form.setValue("categories", [
            ...(currentCategories as Category[]),
            createdCategory as Category,
          ]);
        } else {
          console.log(message);
          toast({
            title: "Error",
            variant: "destructive",
            description: message,
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
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del producto"
                          autoComplete={"off"}
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                  <div className="flex justify-between items-center">
                    <FormLabel>Categorías</FormLabel>
                    <NewCategoryDialog addCategory={onCategoryAdded} />
                  </div>
                  <CategoriesSelector
                    availableCategories={availableCategories}
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
