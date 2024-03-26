import { ScrollArea } from "@/components/ui/scroll-area";
import ProductsSearcher from "@/components/forms/order-form/products-searcher";
import Cart from "@/components/forms/order-form/cart";

export default async function OrdersPage() {
  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-[1fr_550px]">
          <ProductsSearcher />
          <Cart />
        </div>
      </div>
    </ScrollArea>
  );
}
