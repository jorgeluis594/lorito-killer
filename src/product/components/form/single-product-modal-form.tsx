"use client";

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
import FileUpload from "@/product/components/file-upload/file-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { SingleProductSchema } from "@/product/schema";
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
import { debounce } from "@/lib/utils";
import { useUserSession } from "@/lib/use-user-session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import CategoriesModal from "@/category/components/category-list-model/category-modal";
import { HelpTooltip } from "@/shared/components/ui/help-tooltip";

type ProductFormValues = z.infer<typeof SingleProductSchema>;

const getEmptyProductFormValues = (companyId?: string): ProductFormValues => ({
  ...EMPTY_SINGLE_PRODUCT,
  companyId: companyId || "",
});

const transformToProduct = (
  data: ProductFormValues,
  hidden = false,
): SingleProduct => {
  const {
    targetMovementProductId,
    targetMovementProductQuantity,
    ...productData
  } = data;
  const product: SingleProduct = {
    ...productData,
    categories: data.categories || [],
    type: SingleProductType,
    hidden,
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

  const action = formStore.isNew ? "Agregar Producto" : "Guardar cambios";

  const { toast } = useToast();

  // The createdAt and updatedAt fields are not part of the form
  const { createdAt, updatedAt, ...productData } =
    (formStore.product as SingleProduct) || {};

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(SingleProductSchema),
    defaultValues: formStore.isNew
      ? getEmptyProductFormValues(user?.companyId)
      : productData || EMPTY_SINGLE_PRODUCT,
  });

  const resetForm = () => {
    form.reset(getEmptyProductFormValues(user?.companyId));
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSku]);

  useEffect(() => {
    if (!formStore.open) return;

    if (formStore.isNew) {
      resetForm();
    } else {
      form.reset({
        ...productData,
        targetMovementProductId:
          productData.stockConfig && productData.stockConfig.productId,
        targetMovementProductQuantity:
          productData.stockConfig && productData.stockConfig.quantity,
      });
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
          description: "Producto actualizado con exito",
        });
        onActionPerformed();
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
        onActionPerformed();
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Error al registrar el producto, " + res.message,
        });
      }
    }

    formStore.resetProduct(SingleProductType);
    resetForm();
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
    <Sheet
      open={formStore.open}
      onOpenChange={(val) => {
        if (!val) {
          resetForm();
          formStore.resetProduct(SingleProductType);
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
                            onChange={handleCategoriesUpdated}
                          />
                          <div className="flex h-[var(--field-height)] shrink-0 items-center gap-2">
                            <CategoriesModal
                              addCategory={addCategoryToProduct}
                            />
                            <HelpTooltip text="Categorias del Producto" />
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                    name="stock"
                    render={({ field }) => (
                      <FormItem className="col-span-7 sm:col-span-4">
                        <FormLabel>Cantidad</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="off"
                            type="number"
                            disabled={!formStore.isNew}
                            defaultValue={field.value}
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
                      <FormItem className="col-span-5 sm:col-span-2">
                        <FormLabel>Unidad</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!formStore.isNew}
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
                <h3 className="border-t pt-5 text-base font-bold">Precios</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio de compra</FormLabel>
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

export default SingleProductModalForm;
