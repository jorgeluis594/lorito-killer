"use client";

import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import Cart from "@/new-order/components/cart/cart";
import OpenCashShiftForm from "@/cash-shift/components/open-cash-shift-form";
import { LockKeyhole } from "lucide-react";

export default function ProductSearcherWithCashShiftChecker() {
  const cashShift = useCashShift();

  return (
    <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto">
      {cashShift ? (
        <Cart />
      ) : (
        <section className="mx-auto flex min-h-full max-w-lg flex-col items-start justify-center gap-5 px-6 py-12">
          <LockKeyhole
            className="size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold tracking-tight">
            Abre tu caja para empezar
          </h1>
          <p className="text-muted-foreground">
            Registra el monto inicial de tu turno. Después podrás buscar
            productos y realizar tu primera venta.
          </p>
          <OpenCashShiftForm />
        </section>
      )}
    </div>
  );
}
