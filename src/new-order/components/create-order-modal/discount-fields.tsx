import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { TicketPercent } from "lucide-react";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { Input, MoneyInput } from "@/shared/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { toast } from "@/shared/components/ui/use-toast";
import { Discount, Order } from "@/order/types";

function isDiscountValid(order: Order & { discount: Discount }): boolean {
  // Discount type is amount
  if (order.discount.type === "amount") {
    return order.discount.value <= order.netTotal;
  }

  // Discount type is percent
  return order.discount.value <= 100 && order.discount.value > 0;
}

export default function DiscountFields({
  defaultDiscount,
}: {
  defaultDiscount: Discount | undefined;
}) {
  const { order } = useOrderFormStore((state) => state);
  const [isDiscountAvailable, setIsDiscountAvailable] =
    useState<boolean>(!!defaultDiscount);
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    defaultDiscount?.type || "amount",
  );
  const [discountValue, setDiscountValue] = useState<number>(
    defaultDiscount?.value || 0,
  );
  const { setDiscount } = useOrderFormActions();
  const onDiscountTypeChange = (value: string) => {
    if (value === "amount" || value === "percent") {
      setDiscountType(value);
      setDiscountValue(0);
    }
  };

  useEffect(() => {
    if(discountValue === 0) return setDiscount(undefined)

    if (!isDiscountValid({...order,discount: { value: discountValue, type: discountType },})) {
      if(discountType === 'amount'){
        toast({
          title: "Descuento no válido",
          description: `El descuento no puede ser mayor que el total de la orden.`,
          variant: "destructive",
        });
      }else{
        toast({
          title: "Descuento no válido",
          description: `El descuento en porcentaje debe tener un numero válido.`,
          variant: "destructive",
        });
      }
      setDiscount(undefined);
      return
    }

    setDiscount({ type: discountType, value: discountValue });
  }, [discountValue, discountType]);

  const toggleIsDiscountAvailable = () => {
    const value = !isDiscountAvailable;
    setIsDiscountAvailable(value);
    if (!value) {
      setDiscountValue(0);
      setDiscount(undefined);
    }
  };

  const hadleChangePercentInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;

    const filteredValue = value.replace(/[^0-9.]/g, '');

    if (filteredValue === "" || parseFloat(filteredValue) >= 0) {
      setDiscountValue(filteredValue === "" ? 0 : Number(filteredValue));
    }

    e.currentTarget.value = filteredValue;
  }

  return (
    <>
      <div className="flex items-center space-x-2 mt-5">
        {!isDiscountAvailable && (
          <Button type="button" onClick={toggleIsDiscountAvailable} size="sm">
            <TicketPercent className="w-4 h-4 mr-2" /> Agregar descuento
          </Button>
        )}
        {isDiscountAvailable && (
          <Button
            type="button"
            variant="destructive"
            onClick={toggleIsDiscountAvailable}
            size="sm"
          >
            <TicketPercent className="w-4 h-4 mr-2" /> Eliminar descuento
          </Button>
        )}
      </div>
      {isDiscountAvailable && (
        <div className="flex items-center space-x-2 mt-2 transition animate-move-from-up-to-down">
          <Tabs value={discountType} onValueChange={onDiscountTypeChange}>
            <TabsList>
              <TabsTrigger value="amount">S/</TabsTrigger>
              <TabsTrigger value="percent">%</TabsTrigger>
            </TabsList>
          </Tabs>
          {discountType === "amount" ? (
            <MoneyInput
              type="number"
              className="w-40"
              placeholder="S/."
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
            />
          ) : (
            <Input
              type="number"
              className="w-40"
              placeholder="%"
              value={discountValue === 0 ? "" : discountValue}
              onChange={hadleChangePercentInput}
            />
          )}
        </div>
      )}
    </>
  );
}
