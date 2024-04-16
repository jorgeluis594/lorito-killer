"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Category } from "@/category/types";
import { createCategory } from "@/category/actions";
import { CategorySchema } from "@/category/schema";

type CategoryFormValues = z.infer<typeof CategorySchema>;

interface NewSectionDialogProps {
  addCategory: (category: Category) => void;
}

export default function NewCategoryDialog({
  addCategory,
}: NewSectionDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { name: "" } as Category,
  });

  const onSubmit = async (data: CategoryFormValues) => {
    const createdCategory = await createCategory(data);

    if (createdCategory.success) {
      addCategory(createdCategory.data as Category);
      form.setValue("name", "");
      setOpen(false);
    } else {
      alert(createdCategory.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="mr-5 rounded-full w-6 h-6 flex items-center justify-center text-lg border-2 border-slate-400">
          ＋
        </Button>
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
