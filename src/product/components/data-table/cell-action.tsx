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
import { Edit, MoreHorizontal, PackageOpen, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Product, SingleProduct, SingleProductType } from "@/product/types";
import { deleteProduct, findProduct } from "@/product/api_repository";
import { useToast } from "@/shared/components/ui/use-toast";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { performProductMovementStockTransfer } from "@/stock-transfer/components/actions";

interface CellActionProps {
  product: Product;
}

export const CellAction: React.FC<CellActionProps> = ({ product }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [movementStockModalOpen, setMovementStockModalOpen] = useState(false);
  const [targetMovementProduct, setTargetMovementProduct] =
    useState<SingleProduct | null>(null);
  const setProduct = useProductFormStore((store) => store.setProduct);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (
      product.type === SingleProductType &&
      product.stockConfig &&
      movementStockModalOpen
    ) {
      findProduct(product.stockConfig.productId).then((response) => {
        if (response.success) {
          setTargetMovementProduct(response.data as SingleProduct);
        }
      });
    }
  }, [product, movementStockModalOpen]);

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

  const onConfirmStockMovement = () => {
    performProductMovementStockTransfer(product as SingleProduct).then(
      (response) => {
        if (!response.success) {
          toast({
            title: "Error",
            variant: "destructive",
            description: response.message,
          });
          return;
        } else {
          toast({
            title: "Stock actualizado con éxito",
          });
          setMovementStockModalOpen(false);
          router.refresh();
        }
      },
    );
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />

      <AlertModal
        isOpen={movementStockModalOpen}
        onClose={() => setMovementStockModalOpen(false)}
        onConfirm={onConfirmStockMovement}
        loading={loading}
      >
        <>
          {`Se agregara ${(product as SingleProduct).stockConfig?.quantity || ""} ${targetMovementProduct ? UNIT_TYPE_MAPPER[targetMovementProduct.unitType] : ""} al producto `}
          <span className="font-semibold">{targetMovementProduct?.name}</span>
        </>
      </AlertModal>
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
          {product.type === SingleProductType &&
            product.stock > 0 &&
            product.stockConfig && (
              <DropdownMenuItem onClick={() => setMovementStockModalOpen(true)}>
                <PackageOpen className="mr-2 h-4 w-4" /> Mover stock
              </DropdownMenuItem>
            )}
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 h-4 w-4" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
