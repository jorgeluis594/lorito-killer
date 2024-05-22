"use client";

import { useState } from "react";
import { Category } from "@/category/types";
import { deleteCategory } from "@/category/actions";
import { useUserSession } from "@/lib/use-user-session";
import { useToast } from "@/shared/components/ui/use-toast";
import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertModal } from "@/shared/components/modal/alert-modal";

interface deleteCategoryModalProps {
  category: Category;
}

export default function DeleteCategoryModal({
  category
}: deleteCategoryModalProps) {
  const user = useUserSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
      <div>
        <Trash onClick={() => setOpen(true)} className="mr-2 h-4 w-4" />
      </div>
    </>
  );
}