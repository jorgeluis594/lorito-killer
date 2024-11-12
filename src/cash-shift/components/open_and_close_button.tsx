"use client";

import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import OpenCashShiftForm from "@/cash-shift/components/open-cash-shift-form";
import CloseCashShiftForm from "@/cash-shift/components/close-cash-shift-form";

interface OpenAndCloseButtonProps {
  onActionPerform: () => void;
}
export default function OpenAndCloseButton({
  onActionPerform,
}: OpenAndCloseButtonProps) {
  const cashShift = useCashShift();

  return cashShift ? (
    <CloseCashShiftForm onCashShiftClosed={onActionPerform} />
  ) : (
    <OpenCashShiftForm onCashShiftOpened={onActionPerform} />
  );
}
