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
import { createCategory, deleteCategory, updateCategory } from "@/category/actions";
import { CategorySchema } from "@/category/schema";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { useUserSession } from "@/lib/use-user-session";
import { useToast } from "@/shared/components/ui/use-toast";
import { Edit, Trash } from "lucide-react";
import { EMPTY_CATEGORY } from "@/category/constants";
import { useRouter } from "next/navigation";
import { AlertModal } from "@/shared/components/modal/alert-modal";
import { div } from '../../../lib/utils';

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