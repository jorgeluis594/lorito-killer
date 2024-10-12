"use client";

import { HandCoins, Smartphone, CreditCard, PiggyBank } from "lucide-react";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { Separator } from "@/shared/components/ui/separator";
import { Input, MoneyInput } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useCallback, useEffect, useState } from "react";
import {
  AMOUNT, AmountDiscount,
  CashPayment as CashPaymentMethod,
  PaymentMethod, PERCENT, PercentDiscount,
  WalletPayment as WalletPaymentMethod,
} from "@/order/types";
import { BlankCashPayment } from "@/order/constants";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import * as React from "react";
import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";
import {Checkbox} from "@/shared/components/ui/checkbox";
import {useDebounce} from "@/shared/components/ui/multiple-selector";
import {
  Select,
  SelectContent,
  SelectGroup, SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/shared/components/ui/select";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/shared/components/ui/form";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import * as zod from "zod";
import {Button} from "@/shared/components/ui/button";

export const NonePayment: React.FC = () => {
  const { setPaymentMode } = useOrderFormActions();

  return (
    <>
      <Separator className="my-4" />
      <p className="text-lg text-center mt-8">Selecciona un medio de pago</p>
      <div className="grid grid-cols-2 w-fit gap-6 mx-auto mt-4">
        <div
          className="border col-span-1 h-28 w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("cash")}
        >
          <HandCoins className="w-12 h-12" />
          <p className="w-full text-center">EFECTIVO</p>
        </div>
        <div
          className="border col-span-1 h-28 w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("wallet")}
        >
          <Smartphone className="w-12 h-12" />
          <p className="w-full text-center">YAPE</p>
        </div>
        <div
          className="border col-span-1 h-28 w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("card")}
        >
          <CreditCard className="w-12 h-12" />
          <p className="w-full text-center">TARJETA</p>
        </div>
        <div
          className="border col-span-1 h-28 w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("combine")}
        >
          <PiggyBank className="w-12 h-12" />
          <p className="w-full text-center">COMBINADO</p>
        </div>
      </div>
    </>
  );
};

type CashPaymentMethodState = Omit<CashPaymentMethod, "received_amount"> & {
  received_amount: number | null;
};

const DiscountFormSchema = zod.object({
  discountType: zod.enum([AMOUNT, PERCENT]),
  value: zod.coerce.number(),
});

type DiscountFormValues = z.infer<typeof DiscountFormSchema>;

export const CashPayment: React.FC = () => {
  const [isChecked, setIsChecked] = useState(false);
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const {cashShift} = useCashShiftStore((store) => store);
  const {setDiscount, addPayment, removePayment} = useOrderFormActions();
  const [payment, setPayment] = useState<CashPaymentMethodState>({
    ...BlankCashPayment,
    received_amount: null,
  });

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(DiscountFormSchema),
    defaultValues: { discountType: AMOUNT}
  });

  function handleChangeReceivedAmount(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const value = parseFloat(event.target.value);
    setPayment({
      ...payment,
      cashShiftId: cashShift!.id,
      received_amount: value,
    });
  }

  useEffect(() => {
    if (payment.received_amount === null) return;

    if (payment.received_amount >= orderTotal) {
      setPayment({
        ...payment,
        amount: orderTotal,
        change: payment.received_amount - orderTotal,
      });
    } else {
      setPayment({
        ...payment,
        amount: payment.received_amount,
        change: 0,
      });
    }
  }, [payment.received_amount, orderTotal]);

  useEffect(() => {
    const {received_amount, ...rest} = payment;
    if (received_amount === null) return;

    removePayment("cash");
    addPayment({...rest, received_amount});
  }, [payment]);

  useEffect(() => {
    removePayment("cash");
  }, []);

  const handleDiscountSubmit = (data: DiscountFormValues) => {
    const {discountType, value} = data;

    if (discountType === AMOUNT) {
      const discount: AmountDiscount = {
        value: value,
        type: AMOUNT,
      };
      setDiscount(discount);
    } else {
      const discount: PercentDiscount = {
        value: value,
        type: PERCENT,
      };
      setDiscount(discount);
    }
  };

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <MoneyInput
          placeholder="Ingrese monto"
          type="number"
          value={payment.received_amount || ""}
          onChange={handleChangeReceivedAmount}
        />
        <p className="text-sm font-medium text-destructive">
          {payment.received_amount !== 0 &&
          payment.received_amount !== null &&
          payment.received_amount! < orderTotal
            ? "El monto recibido es menor al total"
            : ""}
        </p>
      </div>
      <div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={isChecked}
            onCheckedChange={() => setIsChecked(!isChecked)}
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Aplicar descuento
          </label>
        </div>
        {isChecked && (
          <Form {...form}>
            <form>
              <div className="flex items-center my-3 gap-3">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({field}) => (
                    <FormItem className="col-span-1">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Descuento en"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AMOUNT}>S/. Soles</SelectItem>
                          <SelectItem value={PERCENT}>% Porcentaje</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {form.watch('discountType') === "amount" ? (
                  <FormField
                    control={form.control}
                    name="value"
                    render={({field}) => (
                      <FormItem>
                        <FormControl>
                          <MoneyInput
                            placeholder="Ingrese descuento en soles"
                            type="number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage/>
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="value"
                    render={({field}) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            autoComplete="off"
                            type="number"
                            placeholder="Ingrese descuento en porcentaje"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage/>
                      </FormItem>
                    )}
                  />
                )
                }
              </div>
              <Button type="button" size="sm" onClick={form.handleSubmit(handleDiscountSubmit)}>
                Aplicar Descuento
              </Button>
            </form>
          </Form>
        )}
      </div>
      {payment.change !== 0 && (
        <div className="mt-5">
          Vuelto:
          <span className="text-lg font-medium text-destructive ml-3">
            {payment.change}
          </span>
        </div>
      )}
    </div>
  );
};

export const WalletPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const { addPayment } = useOrderFormActions();
  const { cashShift } = useCashShiftStore((store) => store);
  const [name, setName] = useState<string | null>(null);
  const [operationCode, setOperationCode] = useState<string | null>(null);

  useEffect(() => {
    const params: WalletPaymentMethod = {
      cashShiftId: cashShift!.id,
      amount: orderTotal,
      method: "wallet",
      name: name || undefined,
      operationCode: operationCode || undefined,
    };

    addPayment(params);
  }, [orderTotal, name, operationCode]);

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <MoneyInput type="number" value={orderTotal} disabled />
      </div>

      <div className="my-3">
        <Label>Nombre de cliente</Label>
        <Input
          placeholder="Ingrese nombre"
          value={name || ""}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="my-3">
        <Label>Código de operación</Label>
        <Input
          placeholder="Código de operación"
          value={operationCode || ""}
          onChange={(e) => setOperationCode(e.target.value)}
        />
      </div>
    </div>
  );
};

export const CardPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const { addPayment, removePayment } = useOrderFormActions();
  const { cashShift } = useCashShiftStore((store) => store);

  const onCardChange = (
    value: PaymentMethod & ("debit_card" | "credit_card"),
  ) => {
    if (value === "debit_card") removePayment("credit_card");
    if (value === "credit_card") removePayment("debit_card");

    addPayment({
      cashShiftId: cashShift!.id,
      amount: orderTotal,
      method: value,
    });
  };

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <MoneyInput
          placeholder="Ingrese monto"
          type="number"
          value={orderTotal}
          disabled
        />
      </div>
      <ToggleGroup
        type="single"
        size="lg"
        variant="outline"
        className="gap-0"
        onValueChange={onCardChange}
      >
        <ToggleGroupItem
          value={"debit_card"}
          className="rounded-tr-none rounded-br-none w-48"
        >
          Débito
        </ToggleGroupItem>
        <ToggleGroupItem
          value="credit_card"
          className="rounded-tl-none rounded-bl-none w-48"
        >
          Crédito
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export const CombinedPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const { cashShift } = useCashShiftStore((store) => store);
  const { removeAllPayments, addPayment } = useOrderFormActions();
  const [cashAmount, setCashAmount] = useState(0);
  const [creditCardAmount, setCreditCardAmount] = useState(0);
  const [debitCardAmount, setDebitCardAmount] = useState(0);
  const [walletAmount, setWalletAmount] = useState(0);

  const totalAmount = useCallback((): number => {
    return [cashAmount, creditCardAmount, debitCardAmount, walletAmount].reduce(
      (acc, amount) => {
        if (amount) return acc + amount;
        return acc;
      },
      0,
    );
  }, [cashAmount, creditCardAmount, debitCardAmount, walletAmount]);

  const updatePayments = useCallback(() => {
    removeAllPayments();

    if (cashAmount > 0) {
      addPayment({
        cashShiftId: cashShift!.id,
        amount: cashAmount,
        method: "cash",
        received_amount: cashAmount,
        change: 0,
      });
    }
    if (walletAmount > 0) {
      addPayment({
        cashShiftId: cashShift!.id,
        amount: walletAmount,
        method: "wallet",
      });
    }
    if (creditCardAmount > 0) {
      addPayment({
        cashShiftId: cashShift!.id,
        amount: creditCardAmount,
        method: "credit_card",
      });
    }
    if (debitCardAmount > 0) {
      addPayment({
        cashShiftId: cashShift!.id,
        amount: debitCardAmount,
        method: "debit_card",
      });
    }
  }, [cashAmount, creditCardAmount, debitCardAmount, walletAmount]);

  useEffect(() => {
    if (totalAmount() !== orderTotal) {
      return;
    }

    updatePayments();
  }, [totalAmount, orderTotal, updatePayments]);

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-destructive">
        {totalAmount() != 0 && totalAmount() !== orderTotal
          ? `El monto ${totalAmount()} recibido no coincide con el total`
          : ""}
      </p>
      <div className="my-3">
        <Label>Efectivo</Label>
        <MoneyInput
          placeholder="Ingrese monto"
          type="number"
          value={cashAmount || ""}
          onChange={(e) => setCashAmount(parseFloat(e.target.value))}
        />
      </div>
      <div className="my-3">
        <Label>Tarjeta de crédito</Label>
        <MoneyInput
          placeholder="Ingrese monto"
          type="number"
          value={creditCardAmount}
          onChange={(e) => setCreditCardAmount(parseFloat(e.target.value))}
        />
      </div>
      <div className="my-3">
        <Label>Tarjeta de débito</Label>
        <MoneyInput
          placeholder="Ingrese monto"
          type="number"
          value={debitCardAmount}
          onChange={(e) => setDebitCardAmount(parseFloat(e.target.value))}
        />
      </div>
      <div className="my-3">
        <Label>Billetera virtual (Yape, Plin, etc)</Label>
        <MoneyInput
          placeholder="Ingrese monto"
          type="number"
          value={walletAmount}
          onChange={(e) => setWalletAmount(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};
