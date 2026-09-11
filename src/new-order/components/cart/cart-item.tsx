import { OrderItem } from "@/order/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import KgQuantity from "@/new-order/components/cart/kg-quantity";
import { AddDiscountModal } from "@/new-order/components/cart/add-discount-modal";
import UnitQuantityComponent from "@/new-order/components/cart/unit-quantity";
import ProductThumbnail from "@/new-order/components/product-thumbnail";

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
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-b px-1 py-2 @xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
      <div className="flex min-w-0 items-center gap-2">
        <ProductThumbnail src={item.productPhotoUrl} className="size-10" />
        <div className="min-w-0">
          <p className="break-words font-semibold">{item.productName}</p>
          <p className="text-xs text-muted-foreground">
            {formatPrice(item.productPrice)} /{" "}
            {item.unitType === "kg" ? "kg" : "und"}
          </p>
          {item.discountAmount > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Descuento: −{formatPrice(item.discountAmount)}
            </p>
          )}
        </div>
      </div>
      <div className="col-start-1 row-start-2 w-fit @xl:col-start-2 @xl:row-start-1">
        {item.unitType === "kg" ? (
          <KgQuantity orderItem={item} />
        ) : (
          <UnitQuantityComponent
            item={item}
            onIncreaseIncreaseQuantity={() => increaseQuantity(item.id!)}
            onDecreaseIncreaseQuantity={() => decreaseQuantity(item.id!)}
          />
        )}
      </div>
      <p className="col-start-2 row-start-1 text-right font-semibold tabular-nums @xl:col-start-3">
        {formatPrice(item.total)}
      </p>
      <div className="flex justify-end @xl:col-start-4 @xl:row-start-1">
        <AddDiscountModal orderItem={item} />
        <Button
          type="button"
          size="icon"
          variant="ghost_destructive"
          aria-label={`Quitar ${item.productName}`}
          onClick={() => removeOrderItem(item.id!)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
