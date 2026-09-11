"use client";

import { useState } from "react";
import { Category } from "@/category/types";
import { deleteCategory } from "@/category/actions";
import { useUserSession } from "@/lib/use-user-session";
import { useToast } from "@/shared/components/ui/use-toast";
import { Button } from "@/shared/components/ui/button";
import { Trash } from "lucide-react";
import { AlertModal } from "@/shared/components/modal/alert-modal";
import { useCategoryStore } from "../category-store-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

interface deleteCategoryModalProps {
  category: Category;
}

export default function DeleteCategoryModal({
  category,
}: deleteCategoryModalProps) {
  const user = useUserSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const deleteCategoryFromStore = useCategoryStore(
    (store) => store.deleteCategory,
  );
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
    deleteCategoryFromStore(category.id!);
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${category.name}`}
                onClick={() => setOpen(true)}
              >
                <Trash className="size-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Eliminar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
}
