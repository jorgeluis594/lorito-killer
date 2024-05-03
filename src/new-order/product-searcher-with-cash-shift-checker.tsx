"use client";

import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";
import ProductsSearcher from "@/new-order/components/products-view/products-searcher";
import CashShiftIsNotOpen from "@/cash-shift/components/cash-shift-is-not-open";

export default function ProductSearcherWithCashShiftChecker() {
  const { cashShift } = useCashShiftStore((store) => store);

  return <>{cashShift ? <ProductsSearcher /> : <CashShiftIsNotOpen />}</>;
}
