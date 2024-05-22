"use client";
import { AlertModal } from "@/shared/components/modal/alert-modal";
import { Button } from "@/shared/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/components/ui/use-toast";
import { useCategoryStore } from "../category-store-provider";
import { deleteCategory } from "@/category/actions";
import { Category } from "@/category/types";
import EditCategoryModal from "../category-list-model/edit-category-modal";

interface CellActionProps {
  category: Category;
}

export const CellAction: React.FC<CellActionProps> = ({ category }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const setCategory = useCategoryStore((store) => store.setCategory);
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
      title: "Categoría eliminada",
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
      <EditCategoryModal editCategory={setCategory}/>
      <Button onClick={() => setOpen(true)}>
        <Trash className="mr-2 h-4 w-4" /> Eliminar
        </Button>
      </div>
      
      
      
    </>
  );
};
