import FulfillmentOrder from "@/order/components/fulfillment-order";

export default async function FulfillmentOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; type?: string }>;
}) {
  const query = await searchParams;
  return (
    <FulfillmentOrder
      initialOrderId={query.orderId}
      initialOrderType={query.type === "DELIVERY" ? "DELIVERY" : "TAKE_AWAY"}
    />
  );
}
