import {Button} from "@/shared/components/ui/button";
import {Minus, Plus} from "lucide-react";
import {Input} from "@/shared/components/ui/input";
import {useOrderFormActions} from "@/new-order/order-form-provider";
import {OrderItem} from "@/order/types";

interface UnitQuantityProps {
  item: OrderItem;
  onIncreaseIncreaseQuantity: () => void;
  onDecreaseIncreaseQuantity: () => void;
}

export default function UnitQuantityComponent ({item, onIncreaseIncreaseQuantity, onDecreaseIncreaseQuantity}: UnitQuantityProps) {
  const { updateOrderItem } = useOrderFormActions();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, +e.target.value || 0);
    updateQuantity(value);
  };

  const updateQuantity = (quantity: number) => {
    const updatedItem = { ...item, quantity };
    updateOrderItem(updatedItem);
  };

  return (
    <div className="flex justify-around items-center">
      <Button variant="secondary" onClick={onDecreaseIncreaseQuantity}>
        <Minus className="h-2 w-2 cursor-pointer"/>
      </Button>
      <Input
        value={item.quantity || 0}
        onChange={handleChange}
        className="text-small w-16 text-center border p-1"
      />
      <Button variant="secondary" onClick={onIncreaseIncreaseQuantity}>
        <Plus className="h-2 w-2 cursor-pointer"/>
      </Button>
    </div>
  )
}