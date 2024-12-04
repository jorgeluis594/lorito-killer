import { OrderItem } from "@/order/types";
import { Plus, Minus } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import KgQuantity from "@/new-order/components/cart/kg-quantity";

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

  const UnitQuantityComponent = () => (
    <div className="flex justify-around items-center">
      <Button variant="secondary" onClick={onDecreaseIncreaseQuantity}>
        <Minus className="h-2 w-2 cursor-pointer" />
      </Button>
      <p className="text-small">{item.quantity}</p>
      <Button variant="secondary" onClick={onIncreaseIncreaseQuantity}>
        <Plus className="h-2 w-2 cursor-pointer" />
      </Button>
    </div>
  );

  return (
    <div className="py-2 px-4 border-b grid grid-cols-[270px,1fr,140px] transition animate-move-from-left-to-right hover:bg-accent group">
      <div>
        <p className="text-sm">{item.productName}</p>
        <p className="text-sm text-muted-foreground">
          {formatPrice(item.productPrice)}
        </p>
      </div>
      {item.unitType === "kg" ? (
        <KgQuantity orderItem={item} />
      ) : (
        <UnitQuantityComponent />
      )}
      <div>
        <p className="text-end text-xl font-medium group-hover:hidden">
          {formatPrice(item.total)}
        </p>
        <div className="hidden group-hover:flex justify-end space-x-2">
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={removeProductToCart}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}
