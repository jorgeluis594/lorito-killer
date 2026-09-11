"use client";

import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import OpenCashShiftForm from "@/cash-shift/components/open-cash-shift-form";
import CloseCashShiftForm from "@/cash-shift/components/close-cash-shift-form";
import { useRouter } from "next/navigation";

export default function OpenAndCloseButton() {
  const cashShift = useCashShift();
  const router = useRouter();
  const refresh = () => router.refresh();

  return cashShift ? (
    <CloseCashShiftForm onCashShiftClosed={refresh} />
  ) : (
    <OpenCashShiftForm onCashShiftOpened={refresh} />
  );
}
