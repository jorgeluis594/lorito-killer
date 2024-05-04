"use client";

import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";
import { Button } from "@/shared/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import OpenCashShiftForm from "@/cash-shift/components/open-cash-shift-form";
import CloseCashShiftForm from "@/cash-shift/components/close-cash-shift-form";

interface OpenAndCloseButtonProps {
  onActionPerform: () => void;
}
export default function OpenAndCloseButton({
  onActionPerform,
}: OpenAndCloseButtonProps) {
  const { cashShift, isLoading } = useCashShiftStore((state) => state);

  if (isLoading) {
    return (
      <Button disabled>
        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
        Cargando caja
      </Button>
    );
  }

  return cashShift ? (
    <CloseCashShiftForm onCashShiftClosed={onActionPerform} />
  ) : (
    <OpenCashShiftForm onCashShiftOpened={onActionPerform} />
  );
}
