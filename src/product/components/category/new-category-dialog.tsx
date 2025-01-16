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
import { createCategory } from "@/category/actions";
import { CategorySchema } from "@/category/schema";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { useUserSession } from "@/lib/use-user-session";
import { useToast } from "@/shared/components/ui/use-toast";
import {MenuSquare} from "lucide-react";

type CategoryFormValues = z.infer<typeof CategorySchema>;

interface NewSectionDialogProps {
  addCategory: (category: Category) => void;
}

export default function NewCategoryDialog({
  addCategory,
}: NewSectionDialogProps) {
  const user = useUserSession();
  const [open, setOpen] = useState(false);
  const { categories, setCategories } = useCategoryStore((store) => store);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { name: "" },
  });

  const { toast } = useToast();

  useEffect(() => {
    form.setValue("companyId", user?.companyId || "");
  }, [user]);

  const onSubmit = async (data: CategoryFormValues) => {
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
      setOpen(false);
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: `Error al crear la categoria. ${createdCategory.message}`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="text-xs md:text-sm">Nueva Categoria</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form id="gategory-form">
            <DialogHeader>
              <DialogTitle>Agregar categoría</DialogTitle>
              <DialogDescription>
                Categoriza tus productos para una mejor organización.
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
                Agregar categoría
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
