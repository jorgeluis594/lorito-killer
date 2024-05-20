"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import * as z from "zod";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Category } from "@/category/types";
import { createCategory, updateCategory } from "@/category/actions";
import { CategorySchema } from "@/category/schema";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { useUserSession } from "@/lib/use-user-session";
import { useToast } from "@/shared/components/ui/use-toast";
import { Edit } from "lucide-react";

type CategoryFormValues = z.infer<typeof CategorySchema>;

const transformToCategory = (data: CategoryFormValues): Category => {
  return {
    companyId: data.companyId,
    name: data.name,
  };
};

interface editCategoryModalProps {
  editCategory: (categories: Category[]) => void
}

export default function editCategoryModal({
  editCategory,
}: editCategoryModalProps) {
  const user = useUserSession();
  const formStore = useCategoryStore((store) => store);
  const [open, setOpen] = useState(false);
  const { categories, setCategory } = useCategoryStore((store) => store);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { name: "" },
  });

  const { toast } = useToast();

  useEffect(() => {
    form.setValue("companyId", user?.companyId || "");
  }, [user]);

  const onSubmit = async (data: CategoryFormValues) => {
    const res = await updateCategory({
        category: formStore.categories,
        ...transformToCategory(data),
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
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
        <Edit className="mr-2 h-4 w-4" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form id="gategory-form">
            <DialogHeader>
              <DialogTitle>Editar categoría</DialogTitle>
              <DialogDescription>
                Edita la categoria
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Input
                          id="category"
                          placeholder="Nombre de categoría..."
                          className="col-span-4"
                          {...field}
                        />
                        <FormMessage className="col-span-4" />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              {
                // button submit form
              }
              <Button
                type="button"
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
              >
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}