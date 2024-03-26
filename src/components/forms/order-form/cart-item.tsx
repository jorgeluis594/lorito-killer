import { OrderItem } from "@/order/types";

interface CartItemProps {
  item: OrderItem;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
}

export default function CartItem({
  item,
  increaseQuantity,
  decreaseQuantity,
}: CartItemProps) {
  return (
    <div className="py-2 border-b grid grid-cols-[270px,1fr,140px]">
      <div className="pl-4 ">
        <p className="text-sm">{item.product.name}</p>
        <p className="text-sm text-muted-foreground">s/{item.product.price}</p>
      </div>
      <div></div>
      <div>
        <p className="text-end text-xl font-bold">S/{item.total}</p>
      </div>
    </div>
  );
}
