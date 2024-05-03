import { OrderItem } from "@/order/types";
import { Plus, Minus } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Trash } from "lucide-react";

interface CartItemProps {
  item: OrderItem;
  increaseQuantity: (orderItemId: string) => void;
  decreaseQuantity: (orderItemId: string) => void;
  removeOrderItem: (orderItemId: string) => void;
}

export default function CartItem({
  item,
  increaseQuantity,
  decreaseQuantity,
  removeOrderItem,
}: CartItemProps) {
  const onIncreaseIncreaseQuantity = () => increaseQuantity(item.id!);
  const onDecreaseIncreaseQuantity = () => decreaseQuantity(item.id!);

  return (
    <div className="py-2 border-b grid grid-cols-[270px,1fr,140px] transition animate-move-from-left-to-right hover:bg-accent group">
      <div className="pl-4 ">
        <p className="text-sm">{item.productName}</p>
        <p className="text-sm text-muted-foreground">
          {formatPrice(item.productPrice)}
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
        <p className="text-end text-xl font-medium group-hover:hidden">
          {formatPrice(item.total)}
        </p>
        <Button
          type="button"
          variant="destructive"
          className="hidden group-hover:block ml-auto"
          onClick={() => removeOrderItem(item.id!)}
        >
          <Trash className="h-4 w-4"></Trash>
        </Button>
      </div>
    </div>
  );
}
