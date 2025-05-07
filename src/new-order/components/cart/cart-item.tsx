import { OrderItem } from "@/order/types";
import { Plus, Minus } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import KgQuantity from "@/new-order/components/cart/kg-quantity";
import { AddDiscountModal } from "@/new-order/components/cart/add-discount-modal";
import UnitQuantityComponent from "@/new-order/components/cart/unit-quantity";

interface CartItemProps {
  item: OrderItem;
  increaseQuantity: (orderItemId: string) => void;
  decreaseQuantity: (orderItemId: string) => void;
  increaseQuantityProduct: (orderItemId: string) => void;
  decreaseQuantityProduct: (orderItemId: string) => void;
  removeOrderItem: (orderItemId: string) => void;
  restoreStockProduct: (productId: string, quantity: number) => void;
}

export default function CartItem({
  item,
  increaseQuantity,
  decreaseQuantity,
  increaseQuantityProduct,
  decreaseQuantityProduct,
  removeOrderItem,
  restoreStockProduct,
}: CartItemProps) {
  const onIncreaseIncreaseQuantity = () => {
    increaseQuantity(item.id!);
    decreaseQuantityProduct(item.productId);
  };
  const onDecreaseIncreaseQuantity = () => {
    decreaseQuantity(item.id!);
    increaseQuantityProduct(item.productId);
  };

  const removeProductToCart = () => {
    removeOrderItem(item.id!);
    restoreStockProduct(item.productId, item.quantity);
  };

  return (
    <div className="py-2 px-4 border-b grid md:grid-cols-[240px,1fr,140px] transition animate-move-from-left-to-right hover:bg-accent group">
      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-1">
        <div>
          <p className="text-sm">{item.productName}</p>
          <p className="text-sm text-muted-foreground">
            {formatPrice(item.productPrice)}
          </p>
        </div>
        <div className="md:col-start-2">
          {item.unitType === "kg" ? (
            <KgQuantity orderItem={item}/>
          ) : (
            <UnitQuantityComponent item={item} onIncreaseIncreaseQuantity={onIncreaseIncreaseQuantity}
                                   onDecreaseIncreaseQuantity={onDecreaseIncreaseQuantity}/>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 items-center md:mt-0 md:block md:col-start-3">
        <div className="col-span-1">
          <p className="text-end text-xl font-medium md:group-hover:hidden">
            {formatPrice(item.total)}
          </p>
        </div>
        <div className="col-span-1 justify-self-end md:hidden md:group-hover:flex md:justify-end space-x-2">
          <AddDiscountModal orderItem={item}/>
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={removeProductToCart}
          >
            <Trash2/>
          </Button>
        </div>
      </div>
    </div>
  );
}
