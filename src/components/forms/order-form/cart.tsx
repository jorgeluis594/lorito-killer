import CartItem from "@/components/forms/order-form/cart-item";
import { useOrderFormStore } from "@/components/forms/order-form/order-form-provider";

export default function Cart() {
  const { orderItems, increaseQuantity, decreaseQuantity } = useOrderFormStore(
    (state) => state,
  );

  return (
    <div className="h-full border-l grid grid-rows-[auto,1fr,auto]">
      <div className="p-5 border-b">
        <h2 className="text-xl font-semibold tracking-tight">Pedido</h2>
      </div>
      <div className="py-3 border-b">
        {orderItems.map((item) => (
          <CartItem
            key={item.product.id}
            item={item}
            increaseQuantity={increaseQuantity}
            decreaseQuantity={decreaseQuantity}
          />
        ))}
      </div>
      <div className="p-5">Footer</div>
    </div>
  );
}
