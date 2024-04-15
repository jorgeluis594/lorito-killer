"use client";

import { HandCoins, Smartphone, CreditCard, PiggyBank } from "lucide-react";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/components/forms/order-form/order-form-provider";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useState } from "react";
import type {
  CashPayment as CashPaymentMethod,
  PaymentMethod,
} from "@/order/types";
import { BlankCashPayment } from "@/order/constants";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import * as React from "react";

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

export const CashPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const { addPayment, removePayment } = useOrderFormActions();
  const [payment, setPayment] = useState<CashPaymentMethod>({
    ...BlankCashPayment,
  });

  function handleChangeReceivedAmount(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const value = parseFloat(event.target.value);
    setPayment({ ...payment, received_amount: value });
  }

  useEffect(() => {
    if (payment.received_amount >= orderTotal) {
      setPayment({
        ...payment,
        amount: orderTotal,
        change: payment.received_amount - orderTotal,
      });
    }
  }, [payment.received_amount, orderTotal]);

  useEffect(() => {
    removePayment("cash");
    addPayment(payment);
  }, [payment]);

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <Input
          placeholder="Ingrese monto"
          type="number"
          value={payment.received_amount}
          onChange={handleChangeReceivedAmount}
        />
        <p className="text-sm font-medium text-destructive">
          {payment.received_amount !== 0 && payment.received_amount < orderTotal
            ? "El monto recibido es menor al total"
            : ""}
        </p>
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

  useEffect(() => {
    addPayment({ amount: orderTotal, method: "wallet" });
  }, [orderTotal]);

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <Input type="number" value={orderTotal} disabled />
      </div>
    </div>
  );
};

export const CardPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const { addPayment, removePayment } = useOrderFormActions();

  const onCardChange = (
    value: PaymentMethod & ("debit_card" | "credit_card"),
  ) => {
    if (value === "debit_card") removePayment("credit_card");
    if (value === "credit_card") removePayment("debit_card");

    addPayment({ amount: orderTotal, method: value });
  };

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <Input
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
        amount: cashAmount,
        method: "cash",
        received_amount: cashAmount,
        change: 0,
      });
    }
    if (walletAmount > 0) {
      addPayment({ amount: walletAmount, method: "wallet" });
    }
    if (creditCardAmount > 0) {
      addPayment({ amount: creditCardAmount, method: "credit_card" });
    }
    if (debitCardAmount > 0) {
      addPayment({ amount: debitCardAmount, method: "debit_card" });
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
        <Input
          placeholder="Ingrese monto"
          type="number"
          value={cashAmount}
          onChange={(e) => setCashAmount(parseFloat(e.target.value))}
        />
      </div>
      <div className="my-3">
        <Label>Tarjeta de crédito</Label>
        <Input
          placeholder="Ingrese monto"
          type="number"
          value={creditCardAmount}
          onChange={(e) => setCreditCardAmount(parseFloat(e.target.value))}
        />
      </div>
      <div className="my-3">
        <Label>Tarjeta de débito</Label>
        <Input
          placeholder="Ingrese monto"
          type="number"
          value={debitCardAmount}
          onChange={(e) => setDebitCardAmount(parseFloat(e.target.value))}
        />
      </div>
      <div className="my-3">
        <Label>Billetera virtual (Yape, Plin, etc)</Label>
        <Input
          placeholder="Ingrese monto"
          type="number"
          value={walletAmount}
          onChange={(e) => setWalletAmount(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};