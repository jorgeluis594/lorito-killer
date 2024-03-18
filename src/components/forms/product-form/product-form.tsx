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

type ProductFormValues = z.infer<typeof ProductSchema>;

interface ProductFormProps {
  initialProduct?: Product | null;
  categories: any;
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
                                                        }) => {
  const title = initialProduct ? "Editar producto" : "Registrar producto";
  const description = initialProduct ? "Editar producto." : "Registra un nuevo producto";
  const action = initialProduct ? "Guardar cambios" : "Registrar";
  const {toast} = useToast();

  const product = initialProduct
    ? initialProduct
    : EMPTY_PRODUCT;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product,
  });

  const onSubmit = async (data: ProductFormValues) => {
    if (initialProduct) {
      await repository.update({ id: product.id, ...transformToProduct(data)});
    } else {
      await repository.create(transformToProduct(data));
    }
  };

  const handlePhotosUpdated = async (newPhotos: Photo[]) => {
    const currentPhotos = form.getValues('photos') || [];

    // If the product is new, there is no need to remove the photo from the server
    if (!initialProduct || !initialProduct.id) return;

    const photosToRemove = currentPhotos.filter((photo: Photo) => !newPhotos.find((newPhoto: Photo) => newPhoto.key === photo.key));
    const photosToAppend = newPhotos.filter((photo: Photo) => !currentPhotos.find((currentPhoto: Photo) => currentPhoto.key === photo.key));

    if (photosToRemove.length) {
      form.setValue("photos", newPhotos);
      for (const photo of photosToRemove) {
        const { success, message } = await repository.removePhoto(initialProduct.id as string, photo.id as string);
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
      const { success, message, data } = await repository.storePhotos(initialProduct.id as string, photosToAppend);
      if (success) {
        debugger
        form.setValue("photos", [...currentPhotos, ...data as Photo[]])
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: message,
        });
      }
    }
  }

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
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del producto"
                          autoComplete={"off"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="price"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="categories"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Categorías</FormLabel>
                    <CategoriesSelector
                      availableCategories={[{ id: 'asdjas', name: 'Categoría 1'}, { id: 'asdjas 2', name: 'Categoría 2'}, { id: 'asdjas 3', name: 'Categoría 3'}]}
                      value={field.value || []}
                      onChange={field.onChange}
                    />
                  <FormMessage/>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="photos"
            render={({field}) => (
              <FormItem>
                <FormLabel>Imagenes</FormLabel>
                <FormControl>
                  <FileUpload
                    onChange={handlePhotosUpdated}
                    value={field.value || []}
                  />
                </FormControl>
                <FormMessage/>
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
