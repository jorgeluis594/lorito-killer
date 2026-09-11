import { Category } from "@/category/types";
import DeleteCategoryModal from "./delete-category-modal";
import { Ban, Edit, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CategorySchema } from "@/category/schema";
import { useForm } from "react-hook-form";
import { useToast } from "@/shared/components/ui/use-toast";
import { updateCategory } from "@/category/actions";
import { useUserSession } from "@/lib/use-user-session";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import * as z from "zod";

type CategoryFormValues = z.infer<typeof CategorySchema>;

interface CategoryContentProps {
  category: Category;
  onCategoryUpdated: (category: Category) => void;
}

export default function CategoryContent({
  category,
  onCategoryUpdated,
}: CategoryContentProps) {
  const user = useUserSession();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { ...category },
  });

  const { toast } = useToast();

  useEffect(() => {
    form.setValue("companyId", user?.companyId || "");
  }, [user, form]);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      const res = await updateCategory(data);
      if (res.success) {
        toast({
          description: "Categoría actualizada con exito",
        });
        setIsEditing(false);
        onCategoryUpdated(res.data);
      } else {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Error al actualizar el producto, " + res.message,
        });
      }
    } catch {
      form.setError("name", {
        message: "No se pudo guardar. Inténtalo de nuevo.",
      });
    }
  };

  return (
    <li className="flex min-w-0 items-center gap-2 py-2">
      {isEditing ? (
        <Form {...form}>
          <form
            className="flex min-w-0 flex-1 items-start gap-2"
            onSubmit={(event) => {
              event.stopPropagation();
              void form.handleSubmit(onSubmit)(event);
            }}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormControl>
                    <Input
                      aria-label="Nombre de la categoría"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Guardar categoría"
              disabled={form.formState.isSubmitting}
            >
              <Save className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cancelar edición"
              disabled={form.formState.isSubmitting}
              onClick={() => {
                form.reset(category);
                setIsEditing(false);
              }}
            >
              <Ban className="size-4" />
            </Button>
          </form>
        </Form>
      ) : (
        <>
          <span className="min-w-0 flex-1 break-words text-sm">
            {category.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Editar ${category.name}`}
            onClick={() => setIsEditing(true)}
          >
            <Edit className="size-4" />
          </Button>
          <DeleteCategoryModal category={category} />
        </>
      )}
    </li>
  );
}
