import {useEffect, useState} from "react";
import {Button} from "@/shared/components/ui/button";
import {TicketPercent} from "lucide-react"
import {useOrderFormActions} from "@/new-order/order-form-provider";
import {Input} from "@/shared/components/ui/input";
import {Tabs, TabsList, TabsTrigger} from "@/shared/components/ui/tabs";
import {debounce} from "@/lib/utils";

export default function DiscountFields() {
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
      setDiscountDebouncing({ type: discountType, value: discountValue });
    } else {
      setDiscount(undefined);
    }
  }, [discountValue, discountType]);

  const toggleIsDiscountAvailable = () => {
    const value = !isDiscountAvailable;
    setIsDiscountAvailable(value);
    if (!value) {
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
          <Input
            type="number"
            className="w-40"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
          />
        </div>
      )}
    </>
  );
}