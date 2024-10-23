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
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
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
      setOpen(false);
      onCategoryUpdated(res.data);
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
      <tr key={category.id} className=" text-black hover:bg-gray-100">
        <td className="py-3 px-6 text-left whitespace-nowrap">
          {isEditing ? (
            <div className="flex justify-between items-center">
              <div className="flex text-left">
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
              </div>
              <div className="flex justify-center space-x-4 pr-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Save
                        type="button"
                        className="text-gray-600"
                        size={16}
                        onClick={form.handleSubmit(onSubmit)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Guardar cambio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Ban
                        type="button"
                        color="red"
                        size={16}
                        onClick={() => setIsEditing(false)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cancelar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div className="flex text-left">{category.name}</div>
                <div className="flex justify-center space-x-4">
                  <div onClick={handleEditClick} className="cursor-pointer">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Edit className="h-4 w-4 text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Editar</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <DeleteCategoryModal category={category} />
                </div>
              </div>
            </>
          )}
        </td>
      </tr>
    </>
  );
}
