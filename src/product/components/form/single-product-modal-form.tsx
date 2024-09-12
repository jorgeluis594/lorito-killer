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
import {
  KG_UNIT_TYPE,
  Photo,
  Product,
  SingleProduct,
  SingleProductType,
  UNIT_UNIT_TYPE,
} from "@/product/types";
import { EMPTY_SINGLE_PRODUCT } from "@/product/constants";
import * as repository from "@/product/api_repository";
import { findProduct } from "@/product/api_repository";
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
import { SingleProductSchema } from "@/product/schema";
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
import { debounce } from "@/lib/utils";
import { useUserSession } from "@/lib/use-user-session";
import { getCompany } from "@/order/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import ProductSelector from "@/product/components/form/product-selector";

type ProductFormValues = z.infer<typeof SingleProductSchema>;

const transformToProduct = (data: ProductFormValues): SingleProduct => {
  const {
    targetMovementProductId,
    targetMovementProductQuantity,
    ...productData
  } = data;
  const product: SingleProduct = {
    ...productData,
    categories: data.categories || [],
    type: SingleProductType,
  };

  if (
    targetMovementProductId &&
    targetMovementProductQuantity &&
    targetMovementProductQuantity > 0
  ) {
    product.stockConfig = {
      productId: targetMovementProductId,
      quantity: targetMovementProductQuantity,
    };
  }

  return product;
};

interface ProductFormProps {
  onActionPerformed: () => void;
}

const SingleProductModalForm: React.FC<ProductFormProps> = ({
  onActionPerformed,
}) => {
  const formStore = useProductFormStore((store) => store);
  const user = useUserSession();
  const title = formStore.isNew ? "Agregar producto" : "Editar producto";
  const description = formStore.isNew
    ? "Registra un nuevo producto"
    : "Editar producto.";

  const [targetMovementProduct, setTargetMovementProduct] = useState<
    SingleProduct | undefined
  >();

  const action = formStore.isNew ? "Agregar Producto" : "Guardar cambios";

  const { toast } = useToast();

  // The createdAt and updatedAt fields are not part of the form
  const { createdAt, updatedAt, ...productData } =
    (formStore.product as SingleProduct) || {};

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(SingleProductSchema),
    defaultValues: formStore.isNew
      ? { ...EMPTY_SINGLE_PRODUCT, stock: undefined }
      : productData || EMPTY_SINGLE_PRODUCT,
  });

  const productSku = form.watch("sku");

  const skuSearch = async function (sku: string) {
    if (!sku) return form.clearErrors("sku");

    const res = await repository.findProduct(sku!);
    if (
      !formStore.isNew &&
      res.success &&
      res.data.id !== formStore.product.id
    ) {
      form.setError("sku", {
        type: "custom",
        message: "Ya existe un producto con el mismo sku",
      });
    } else {
      form.clearErrors("sku");
    }
  };

  const skuDebounce = debounce(skuSearch, 200);

  useEffect(() => {
    skuDebounce(productSku!).catch((error) => console.error("Error", error));
  }, [productSku]);

  useEffect(() => {
    if (formStore.isNew) {
      form.reset({ ...EMPTY_SINGLE_PRODUCT });
      getCompany().then((response) => {
        if (response.success) {
          form.setValue("companyId", response.data.id);
        }
      });
    } else {
      form.reset({
        ...productData,
        targetMovementProductId:
          productData.stockConfig && productData.stockConfig.productId,
        targetMovementProductQuantity:
          productData.stockConfig && productData.stockConfig.quantity,
      });
      const targetMovementProductId = form.getValues("targetMovementProductId");

      if (targetMovementProductId) {
        findProduct(targetMovementProductId).then((response) => {
          if (response.success && response.data.type === SingleProductType) {
            setTargetMovementProduct(response.data);
          }
        });
      }
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
          description: "Producto actualizado con exito",
        });
        onActionPerformed();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Error al actualizar el producto, " + res.message,
        });
        formStore.resetProduct(SingleProductType);
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
        formStore.resetProduct(SingleProductType);
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
    <Dialog
      open={formStore.open}
      onOpenChange={(val) => {
        formStore.resetProduct(SingleProductType);
        form.reset({ ...EMPTY_SINGLE_PRODUCT });
        formStore.setOpen(val);
      }}
    >
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
                    name="stock"
                    render={({ field }) => (
                      <FormItem className="col-span-4">
                        <FormLabel>Cantidad</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="off"
                            type="number"
                            disabled={!formStore.isNew}
                            placeholder="Ingrese cantidad"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitType"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Unidad</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione unidad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={UNIT_UNIT_TYPE}>und</SelectItem>
                            <SelectItem value={KG_UNIT_TYPE}>kg</SelectItem>
                          </SelectContent>
                        </Select>
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    name="targetMovementProductId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Producto de traspaso de stock</FormLabel>
                        <FormControl>
                          <ProductSelector
                            value={targetMovementProduct}
                            onSelect={(product) => {
                              setTargetMovementProduct(product);
                              form.setValue(
                                "targetMovementProductId",
                                product.id!,
                              );
                            }}
                            productType="SingleProduct"
                            skipProductIds={
                              !formStore.isNew
                                ? [formStore.product.id!]
                                : undefined
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="targetMovementProductQuantity"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad a traspasar</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ingrese cantidad"
                            {...field}
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

export default SingleProductModalForm;
