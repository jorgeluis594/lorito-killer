import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import type { RestaurantFinancialBlock } from "../use-cases/order-operation-policy";

export function FinancialBlockNotice({
  block,
  orderId,
}: {
  block: RestaurantFinancialBlock;
  orderId: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>Operacion bloqueada</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{block.message}</span>
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/orders/${orderId}`}>Revisar venta</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
