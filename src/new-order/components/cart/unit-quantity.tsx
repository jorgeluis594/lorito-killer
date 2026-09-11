import { Button } from "@/shared/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { useOrderFormActions } from "@/new-order/order-form-provider";
import { OrderItem } from "@/order/types";

interface UnitQuantityProps {
  item: OrderItem;
  onIncreaseIncreaseQuantity: () => void;
  onDecreaseIncreaseQuantity: () => void;
}

export default function UnitQuantityComponent({
  item,
  onIncreaseIncreaseQuantity,
  onDecreaseIncreaseQuantity,
}: UnitQuantityProps) {
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
    <div className="flex justify-center items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={`Reducir cantidad de ${item.productName}`}
        onClick={onDecreaseIncreaseQuantity}
      >
        <Minus aria-hidden="true" />
      </Button>
      <Input
        value={item.quantity || 0}
        onChange={handleChange}
        aria-label={`Cantidad de ${item.productName}`}
        inputMode="numeric"
        className="w-16 text-center tabular-nums"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={`Aumentar cantidad de ${item.productName}`}
        onClick={onIncreaseIncreaseQuantity}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
