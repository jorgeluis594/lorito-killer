import OrderList from "@/order/components/orders-list";

export default function Page() {
  return (
    <div className="h-[calc(100vh-theme(space.14))]">
      <div className="grid grid-cols-[380px_1fr] h-full">
        <OrderList />
      </div>
    </div>
  );
}
