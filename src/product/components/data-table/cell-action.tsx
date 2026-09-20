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
import {
  Edit,
  Eye,
  EyeOff,
  MoreHorizontal,
  PackageOpen,
  Trash,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Product, SingleProduct, SingleProductType } from "@/product/types";
import { deleteProduct, findProduct } from "@/product/api_repository";
import { useToast } from "@/shared/components/ui/use-toast";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { performProductMovementStockTransfer } from "@/stock-transfer/components/actions";
import { useUserSession } from "@/lib/use-user-session";
import { hideProduct, unhideProduct } from "@/product/actions";
import { getKitchenOptions } from "@/kitchen/actions";
import type { KitchenOption } from "@/kitchen/types";
import { Modal } from "@/shared/components/ui/modal";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface CellActionProps {
  product: Product;
}

export const CellAction: React.FC<CellActionProps> = ({ product }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [movementStockModalOpen, setMovementStockModalOpen] = useState(false);
  const [kitchenModalOpen, setKitchenModalOpen] = useState(false);
  const [kitchens, setKitchens] = useState<KitchenOption[]>([]);
  const [selectedKitchen, setSelectedKitchen] = useState("UNASSIGNED");
  const [targetMovementProduct, setTargetMovementProduct] =
    useState<SingleProduct | null>(null);
  const setProduct = useProductFormStore((store) => store.setProduct);
  const router = useRouter();
  const { toast } = useToast();
  const user = useUserSession();

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

  const onHideProduct = async () => {
    const response = await hideProduct(product.id!);
    if (!response.success) {
      toast({
        title: "Error",
        variant: "destructive",
        description: response.message,
      });
      return;
    }
    toast({
      title: "Producto ocultado",
    });
    router.refresh();
  };

  const onUnhideProduct = async () => {
    const response = await unhideProduct(product.id!);
    if (!response.success) {
      if (response.type === "KitchenConfigurationRequired") {
        const kitchenResponse = await getKitchenOptions();
        if (kitchenResponse.success) {
          setKitchens(kitchenResponse.data);
          setSelectedKitchen("UNASSIGNED");
          setKitchenModalOpen(true);
          return;
        }
        toast({
          title: "Error",
          variant: "destructive",
          description: kitchenResponse.message,
        });
        return;
      }
      toast({
        title: "Error",
        variant: "destructive",
        description: response.message,
      });
      return;
    }
    toast({
      title: "Producto desocultado",
    });
    router.refresh();
  };

  const onConfirmUnhideProduct = async () => {
    setLoading(true);
    const response = await unhideProduct(
      product.id!,
      selectedKitchen === "UNASSIGNED" ? null : selectedKitchen,
    );
    setLoading(false);
    if (!response.success) {
      toast({
        title: "Error",
        variant: "destructive",
        description: response.message,
      });
      return;
    }
    setKitchenModalOpen(false);
    toast({ title: "Producto desocultado" });
    router.refresh();
  };

  const onConfirmStockMovement = () => {
    performProductMovementStockTransfer(
      user!.id,
      product as SingleProduct,
    ).then((response) => {
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
    });
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
      <Modal
        title="Destino de preparación"
        description="Elige una Kitchen activa o deja el producto sin Kitchen."
        isOpen={kitchenModalOpen}
        onClose={() => setKitchenModalOpen(false)}
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`kitchen-${product.id}`}>Kitchen</Label>
            <Select value={selectedKitchen} onValueChange={setSelectedKitchen}>
              <SelectTrigger id={`kitchen-${product.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="UNASSIGNED">Sin cocina</SelectItem>
                  {kitchens.map((kitchen) => (
                    <SelectItem key={kitchen.id} value={kitchen.id}>
                      {kitchen.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              disabled={loading}
              variant="outline"
              onClick={() => setKitchenModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button disabled={loading} onClick={onConfirmUnhideProduct}>
              Desocultar
            </Button>
          </div>
        </div>
      </Modal>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>

          <DropdownMenuItem onClick={() => setProduct(product)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
          {product.hidden ? (
            <DropdownMenuItem onClick={onUnhideProduct}>
              <Eye className="mr-2 h-4 w-4" /> Desocultar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onHideProduct}>
              <EyeOff className="mr-2 h-4 w-4" /> Ocultar
            </DropdownMenuItem>
          )}
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
