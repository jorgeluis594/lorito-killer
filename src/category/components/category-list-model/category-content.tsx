import { Category } from "@/category/types";
import DeleteCategoryModal from "./delete-category-modal";
import { Edit } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CategorySchema } from "@/category/schema";
import { useForm } from "react-hook-form";
import { useToast } from "@/shared/components/ui/use-toast";
import { updateCategory } from "@/category/actions";
import { useUserSession } from "@/lib/use-user-session";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/shared/components/ui/form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import * as z from "zod";
import { div } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { ...category },
  });

  const { toast } = useToast();

  useEffect(() => {
    form.setValue("companyId", user?.companyId || "");
  }, [user]);

  const onSubmit = async (data: CategoryFormValues) => {
    const res = await updateCategory(data);
    if (res.success) {
      toast({
        description: "Categoría actualizada con exito",
      });
      setOpen(false)
      onCategoryUpdated(res.data)
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Error al actualizar el producto, " + res.message,
      });
    }
    setIsEditing(false);
  };


  const handleEditClick = () => {
    setIsEditing(true);
  };
  return (
    <>
      <tr key={category.id} className="border-b  text-black border-gray-200 hover:bg-gray-100">
        <td className="py-3 px-6 text-left whitespace-nowrap">
          {isEditing ? (
            <div className="flex items-center space-x-4">
              <Form {...form}>
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
                              className="col-span-4 -ml-2"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </Form>
              <div>
                <Button
                  type="button"
                  size="xs"
                  onClick={form.handleSubmit(onSubmit)}
                >
                  Guardar cambios
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div className="flex-1 text-left">{category.name}</div>
                <div className="flex justify-center space-x-4">
                  <div onClick={handleEditClick} className="cursor-pointer">
                    <Edit className="h-4 w-4 text-gray-600" />
                  </div>
                  <DeleteCategoryModal category={category} />
                </div>
              </div>
            </>
          )}
        </td>
      </tr>
    </>
  )
}
