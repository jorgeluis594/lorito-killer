import { OrderItem } from "@/order/types";
import { Plus, Minus } from "lucide-react";

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
    <div className="py-2 border-b grid grid-cols-[270px,1fr,140px]">
      <div className="pl-4 ">
        <p className="text-sm">{item.product.name}</p>
        <p className="text-sm text-muted-foreground">s/{item.product.price}</p>
      </div>
      <div className="flex justify-around items-center">
        <Minus
          className="h-2 w-2 cursor-pointer"
          onClick={onDecreaseIncreaseQuantity}
        />
        <p className="text-small">{item.quantity}</p>
        <Plus
          className="h-2 w-2 cursor-pointer"
          onClick={onIncreaseIncreaseQuantity}
        />
      </div>
      <div>
        <p className="text-end text-xl font-bold">S/{item.total}</p>
      </div>
    </div>
  );
}
