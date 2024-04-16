"use client";

import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";
import ProductsSearcher from "@/components/forms/order-form/products-searcher";
import CashShiftForm from "@/cash-shift/components/form";

const CashShiftIsNotOpen = () => {
  return (
    <div className="flex text-center items-center justify-center h-full">
      <div>
        <p className="text-center text-lg text-gray-600">
          No tienes una caja abierta, abre una para generar ventas
        </p>
        <hr className="my-4" />
        <CashShiftForm />
      </div>
    </div>
  );
};

export default function ProductSearcherWithCashShiftChecker() {
  const { cashShift, isLoading } = useCashShiftStore((store) => store);

  return <>{cashShift ? <ProductsSearcher /> : <CashShiftIsNotOpen />}</>;
}
