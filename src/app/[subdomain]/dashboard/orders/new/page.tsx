import Cart from "@/new-order/components/cart/cart";
import ProductSearcherWithCashShiftChecker from "@/new-order/product-searcher-with-cash-shift-checker";

export default async function OrdersPage() {
  return (
    <div className="h-[calc(100vh-theme(space.14))]">
      <div className="flex-1 space-y-4 h-full">
        <div className="h-full grid grid-cols-[1fr_550px] auto-rows-[100%]">
          <ProductSearcherWithCashShiftChecker />
          <Cart />
        </div>
      </div>
    </div>
  );
}
