"use client";
import * as z from "zod";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Product, Photo } from "@/product/types";
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
/*import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";*/

export const IMG_MAX_LIMIT = 5;
const PhotoSchema = z.object({
  name: z.string(),
  size: z.number(),
  key: z.string(),
  url: z.string(),
});

const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "El nombre del producto debe tener al menos 3 caracteres" }),
  price: z.coerce.number(),
  sku: z.string().min(3, { message: "El sku debe tener al menos 3 caracteres" }),
  stock: z.coerce.number(),
  photos: z
    .array(PhotoSchema)
    .max(IMG_MAX_LIMIT, { message: "You can only add up to 5 images" })
    .min(1, { message: "At least one image must be added." }),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialProduct: Product | undefined;
  categories: any;
}

const transformToProduct = (data: ProductFormValues): Product => {
  return {
    name: data.name,
    price: data.price,
    sku: data.sku,
    stock: data.stock,
    photos: data.photos
  };
};

export const ProductForm: React.FC<ProductFormProps> = ({
                                                          initialProduct,
                                                          categories,
                                                        }) => {
  const title = initialProduct ? "Editar producto" : "Registrar producto";
  const description = initialProduct ? "Editar producto." : "Registra un nuevo producto";
  const action = initialProduct ? "Guardar cambios" : "Registrar";

  const product = initialProduct
    ? initialProduct
    : {
      name: "",
      description: "",
      price: 0,
      category: "",
      sku: "",
      stock: 0,
      photos: []
    } as Product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product,
  });

  const onSubmit = async (data: ProductFormValues) => {
    if (initialProduct) {
      await repository.update({ id: product.id, ...transformToProduct(data)});
    } else {
      await repository.create(transformToProduct(data));
    }
  };

  const handlePhotoRemove = async (key: string) => {
    const currentPhotos = form.getValues('photos');
    form.setValue("photos", currentPhotos.filter((photo: Photo) => photo.key !== key));
    if (!initialProduct || !initialProduct.id) return;

    const photoToRemove = currentPhotos.find((photo: Photo) => photo.key === key);
    if (!photoToRemove) return;

    const { success, message } = await repository.removePhoto(initialProduct.id, key);
    if (!success) {
      console.error({message});
      return;
    }
  }

/*  const onDelete = async () => {
    try {
      setLoading(true);
      //   await axios.delete(`/api/${params.storeId}/products/${params.productId}`);
      router.refresh();
      router.push(`/${params.storeId}/products`);
    } catch (error: any) {
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };*/

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
          <FormField
            control={form.control}
            name="photos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagenes</FormLabel>
                <FormControl>
                  <FileUpload
                    onChange={field.onChange}
                    value={field.value}
                    onRemove={handlePhotoRemove}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="md:grid md:grid-cols-3 gap-8">
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
            {/*<FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Seleccionar categoría"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       @ts-ignore
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />*/}
          </div>
          <Button className="ml-auto btn-success" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
