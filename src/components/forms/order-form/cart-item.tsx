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
    <div className="flex items-center justify-between p-5 border-b">
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 bg-gray-200 rounded-md"></div>
        <div>
          <h3 className="text-sm font-semibold">{item.product.name}</h3>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-xs text-gray-500">-</button>
        <span className="text-sm font-semibold">1</span>
        <button className="text-xs text-gray-500">+</button>
      </div>
    </div>
  );
}
