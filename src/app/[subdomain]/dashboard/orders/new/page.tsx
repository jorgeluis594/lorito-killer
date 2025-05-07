import Cart from "@/new-order/components/cart/cart";
import ProductSearcherWithCashShiftChecker from "@/new-order/product-searcher-with-cash-shift-checker";

export default async function OrdersPage() {
  return (
    <div className="h-[calc(100vh-theme(space.14))]">
      <div className="flex-1 space-y-4 h-full">
        <div className="h-full grid grid-cols-1 md:grid-cols-[1fr_550px] md:auto-rows-[100%]">
          <ProductSearcherWithCashShiftChecker />
          <div className="hidden md:block">
            <Cart/>
          </div>
        </div>
      </div>
    </div>
  );
}
