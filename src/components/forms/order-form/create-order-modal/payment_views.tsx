"use client";

import { HandCoins, Smartphone, CreditCard, PiggyBank } from "lucide-react";
import { useOrderFormActions } from "@/components/forms/order-form/order-form-provider";

export const NonePayment: React.FC = () => {
  const { setPaymentMode } = useOrderFormActions();

  return (
    <>
      <p className="text-lg text-center mt-8">Selecciona un medio de pago</p>
      <div className="grid grid-cols-2 w-fit gap-6 mx-auto mt-4">
        <div
          className="border col-span-1 h-28 w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("cash")}
        >
          <HandCoins className="w-12 h-12" />
          <p className="w-full text-center">EFECTIVO</p>
        </div>
        <div className="border col-span-1 h-28 w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent">
          <Smartphone className="w-12 h-12" />
          <p className="w-full text-center">YAPE</p>
        </div>
        <div className="border col-span-1 h-28 w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent">
          <CreditCard className="w-12 h-12" />
          <p className="w-full text-center">TARJETA</p>
        </div>
        <div className="border col-span-1 h-28 w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent">
          <PiggyBank className="w-12 h-12" />
          <p className="w-full text-center">COMBINADO</p>
        </div>
      </div>
    </>
  );
};

export const CashPayment: React.FC = () => {
  return <p>Cash payment</p>;
};

export const WalletPayment: React.FC = () => {
  return <p>Wallet payment</p>;
};

export const CardPayment: React.FC = () => {
  return <p>Card payment</p>;
};

export const CombinedPayment: React.FC = () => {
  return <p>Combined payment</p>;
};
