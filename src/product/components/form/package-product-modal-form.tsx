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

import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PackageProduct, PackageProductType, Photo } from "@/product/types";
import {
  EMPTY_PACKAGE_PRODUCT,
  EMPTY_SINGLE_PRODUCT,
} from "@/product/constants";
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
import { Heading } from "@/shared/components/ui/heading";
import { PackageProductSchema } from "@/product/schema";
import CategoriesSelector from "@/product/components/category/categories-selector";
import { useToast } from "@/shared/components/ui/use-toast";
import NewCategoryDialog from "@/product/components/category/new-category-dialog";
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
import { useProductsStore } from "@/product/components/products-store-provider";
import { getCompany } from "@/order/actions";
import CategoriesModal from "@/category/components/category-list-model/category-modal";

type ProductFormValues = z.infer<typeof PackageProductSchema>;

const transformToProduct = (data: ProductFormValues): PackageProduct => {
  return {
    companyId: data.companyId,
    name: data.name,
    price: data.price,
    sku: data.sku,
    type: PackageProductType,
    description: data.description,
    photos: data.photos,
    productItems: data.productItems,
    categories: data.categories || [],
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
      ? { ...EMPTY_PACKAGE_PRODUCT }
      : productData || EMPTY_PACKAGE_PRODUCT,
  });

  // Setting the companyId to the product
  useEffect(() => {
    if (formStore.isNew) {
      getCompany().then((response) => {
        if (response.success) {
          form.setValue("companyId", response.data.id);
        }
      });
    } else {
      form.reset(productData);
    }
  }, [formStore, form, user]);

  const onSubmit = async (data: ProductFormValues) => {
    formStore.setOpen(false);
    if (!formStore.isNew) {
      const res = await repository.update({
        id: formStore.product.id,
        ...transformToProduct(data),
      });
      if (res.success) {
        toast({
          duration: 2000,
          description: "Pack actualizado con exito",
        });
        onActionPerformed();
      } else {
        toast({
          title: "Error",
          duration: 2000,
          variant: "destructive",
          description:
            "Error al actualizar el pack de productos, " + res.message,
        });
        formStore.resetProduct(PackageProductType);
      }
    } else {
      const res = await repository.create(transformToProduct(data));
      if (res.success) {
        toast({
          duration: 2000,
          description: "Pack creado con exito",
        });
        onActionPerformed();
      } else {
        toast({
          title: "Error",
          duration: 2000,
          variant: "destructive",
          description:
            "Error al registrar el pack de productos, " + res.message,
        });
        formStore.resetProduct(PackageProductType);
      }
    }
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
            duration: 2000,
            description: "Photo eliminada con exito",
          });
        } else {
          toast({
            title: "Error",
            duration: 2000,
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
          duration: 2000,
          description: "Photos subidas con exito",
        });
      } else {
        toast({
          title: "Error",
          duration: 2000,
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
        duration: 2000,
        description: `Categoria ${category.name} agregada con exito`,
      });
    } else {
      toast({
        title: "Error",
        duration: 2000,
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
        duration: 2000,
        description: `Categoria ${category.name} eliminada del producto con exito`,
      });
    } else {
      toast({
        title: "Error",
        duration: 2000,
        variant: "destructive",
        description: `Error al eliminar la categoria ${category.name}`,
      });
    }
  };

  return (
    <Dialog open={formStore.open} onOpenChange={formStore.setOpen}>
      <DialogContent className="sm:max-w-[750px] sm:h-[750px] w-full flex flex-col justify-center items-center p-0">
        <ScrollArea className="p-6 w-full">
          <div className="flex items-center justify-between">
            <Heading title={title} />
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
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <div className="flex justify-between items-center gap-4">
                        <CategoriesSelector
                          value={field.value || []}
                          onCategoryAdded={onCategoryAdded}
                          onCategoryRemoved={onCategoryRemoved}
                        />
                        <CategoriesModal addCategory={addCategoryToProduct}/>
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

export default PackageProductModalForm;
