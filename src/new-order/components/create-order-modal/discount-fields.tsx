import {useEffect, useState} from "react";
import {Button} from "@/shared/components/ui/button";
import {TicketPercent} from "lucide-react"
import {useOrderFormActions, useOrderFormStore} from "@/new-order/order-form-provider";
import {Input, MoneyInput} from "@/shared/components/ui/input";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/shared/components/ui/tabs";
import {debounce} from "@/lib/utils";
import {toast} from "@/shared/components/ui/use-toast";

export default function DiscountFields() {
  const { order } = useOrderFormStore((state) => state);
  const [isDiscountAvailable, setIsDiscountAvailable] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const { setDiscount } = useOrderFormActions();
  const onDiscountTypeChange = (value: string) => {
    if (value === 'amount' || value === 'percent') {
      setDiscountType(value);
      setDiscountValue(0);
    }
  }

  const setDiscountDebouncing = debounce(setDiscount, 200);
  useEffect(() => {
    if (discountValue) {
      let validDiscount = true;

      if (discountType === 'amount' && discountValue > order.netTotal) {
        validDiscount = false;
      } else if (discountType === 'percent' && (discountValue > 100 || discountValue < 0)) {
        validDiscount = false;
      }

      if (validDiscount) {
        setDiscountDebouncing({ type: discountType, value: discountValue });
      } else {
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
      }
    } else {
      setDiscount(undefined);
    }
  }, [discountValue, discountType]);

  const toggleIsDiscountAvailable = () => {
    const value = !isDiscountAvailable;
    setIsDiscountAvailable(value);
    if (!value) {
      setDiscountValue(0);
      setDiscount(undefined);
    }
  }

  return (
    <>
      <div className="flex items-center space-x-2 mt-5">
        {!isDiscountAvailable && <Button type="button" onClick={toggleIsDiscountAvailable} size="sm" ><TicketPercent className="w-4 h-4 mr-2"/> Agregar descuento</Button> }
        {isDiscountAvailable && <Button type="button" variant="destructive" onClick={toggleIsDiscountAvailable} size="sm" ><TicketPercent className="w-4 h-4 mr-2"/> Eliminar descuento</Button> }
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
          ): (
            <Input
            type="number"
            className="w-40"
            placeholder="%"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            />
          )}
        </div>
      )}
    </>
  );
}