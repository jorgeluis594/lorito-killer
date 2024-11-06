"use client";

import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import ProductsSearcher from "@/new-order/components/products-view/products-searcher";
import CashShiftIsNotOpen from "@/cash-shift/components/cash-shift-is-not-open";

export default function ProductSearcherWithCashShiftChecker() {
  const cashShift = useCashShift();

  return <>{cashShift ? <ProductsSearcher /> : <CashShiftIsNotOpen />}</>;
}
