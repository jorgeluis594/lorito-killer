import { OrderItem } from "@/order/types";
import { Plus, Minus } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CartItemProps {
  item: OrderItem;
  increaseQuantity: (orderItemId: string) => void;
  decreaseQuantity: (orderItemId: string) => void;
}

export default function CartItem({
  item,
  increaseQuantity,
  decreaseQuantity,
}: CartItemProps) {
  const onIncreaseIncreaseQuantity = () => increaseQuantity(item.id!);
  const onDecreaseIncreaseQuantity = () => decreaseQuantity(item.id!);

  return (
    <div className="py-2 border-b grid grid-cols-[270px,1fr,140px] transition animate-move-from-left-to-right">
      <div className="pl-4 ">
        <p className="text-sm">{item.product.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatPrice(item.product.price)}
        </p>
      </div>
      <div className="flex justify-around items-center">
        <Button variant="secondary" onClick={onDecreaseIncreaseQuantity}>
          <Minus className="h-2 w-2 cursor-pointer" />
        </Button>
        <p className="text-small">{item.quantity}</p>
        <Button variant="secondary" onClick={onIncreaseIncreaseQuantity}>
          <Plus className="h-2 w-2 cursor-pointer" />
        </Button>
      </div>
      <div>
        <p className="text-end text-xl font-medium">
          {formatPrice(item.total)}
        </p>
      </div>
    </div>
  );
}
