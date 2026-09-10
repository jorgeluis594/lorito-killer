"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import * as z from "zod";
import { Button } from "@/shared/components/ui/button";
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
import { createCategory } from "@/category/actions";
import { CategorySchema } from "@/category/schema";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { useUserSession } from "@/lib/use-user-session";
import { useToast } from "@/shared/components/ui/use-toast";

type CategoryFormValues = z.infer<typeof CategorySchema>;

interface NewSectionDialogProps {
  addCategory: (category: Category) => void;
}

export default function NewCategoryForm({
  addCategory,
}: NewSectionDialogProps) {
  const user = useUserSession();
  const { categories, setCategories } = useCategoryStore((store) => store);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { name: "" },
  });

  const { toast } = useToast();

  useEffect(() => {
    form.setValue("companyId", user?.companyId || "");
  }, [user, form]);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      const createdCategory = await createCategory({
        ...data,
        companyId: user!.companyId,
      });

      if (createdCategory.success) {
        setCategories([...categories, createdCategory.data]);
        addCategory(createdCategory.data);
        form.setValue("name", "");
        toast({
          description: `Categoria ${createdCategory.data.name} creada con exito`,
        });
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: `Error al crear la categoria. ${createdCategory.message}`,
        });
      }
    } catch {
      form.setError("name", {
        message: "No se pudo crear la categoría. Inténtalo de nuevo.",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.stopPropagation();
          void form.handleSubmit(onSubmit)(event);
        }}
      >
        <h3 className="text-sm font-semibold">Nueva categoría</h3>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la categoría</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej. Bebidas"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creando…" : "Crear categoría"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
