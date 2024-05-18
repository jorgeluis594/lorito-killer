"use client";
import { AlertModal } from "@/shared/components/modal/alert-modal";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/product/types";
import { deleteProduct } from "@/product/api_repository";
import { useToast } from "@/shared/components/ui/use-toast";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { useCategoryStore } from "../category-store-provider";
import { deleteCategory } from "@/category/db_respository";
import { Category } from "@/category/types";

interface CellActionProps {
  category: Category;
}

export const CellAction: React.FC<CellActionProps> = ({ category }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const setCategory = useCategoryStore((store) => store.setCategories);
  const router = useRouter();
  const { toast } = useToast();

  const onConfirm = async () => {
    setLoading(true);
    const deleteResponse = await deleteCategory(category);
    setLoading(false);
    if (!deleteResponse.success) {
      toast({
        title: "Error",
        variant: "destructive",
        description: deleteResponse.message,
      });
      return;
    }

    setOpen(false);
    toast({
      title: "Categoría eliminado",
    });
    router.refresh();
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <div >
      <Button onClick={() => setCategory([category])}>
        <Edit className="mr-2 h-4 w-4" /> Editar
      </Button>
      <Button onClick={() => setOpen(true)}>
        <Trash className="mr-2 h-4 w-4" /> Eliminar
        </Button>
      </div>
      
      
      
    </>
  );
};
