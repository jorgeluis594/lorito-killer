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

interface CellActionProps {
  product: Product;
}

export const CellAction: React.FC<CellActionProps> = ({ product }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const setProduct = useProductFormStore((store) => store.setProduct);
  const router = useRouter();
  const { toast } = useToast();

  const onConfirm = async () => {
    setLoading(true);
    const deleteResponse = await deleteProduct(product);
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
      title: "Producto eliminado",
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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>

          <DropdownMenuItem onClick={() => setProduct(product)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 h-4 w-4" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
