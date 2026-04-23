import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {ProductToSales} from "@/sales-dashboard/type";

interface RecentSalesProps {
  data: ProductToSales
}

export function RecentSales({ data }: RecentSalesProps) {
  return (
    <div className="flex items-center p-2 rounded-lg shadow-sm border border-gray-200 space-x-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={data.photos?.[0]?.url} alt="Avatar" />
      </Avatar>
      <div className="flex-1 space-y-1">
        <p className="text-md font-semibold">{data.productName}</p>
        <p className="text-sm text-gray-500">Cantidad: {data.quantity}</p>
      </div>
      <div className="font-medium text-lg text-primary">S/. {data.total}</div>
    </div>
  );
}