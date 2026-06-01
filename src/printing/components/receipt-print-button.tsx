"use client";

import { Loader2, Printer } from "lucide-react";
import { useState } from "react";

import { printOrderReceipt } from "@/printing/print-order-receipt";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/use-toast";

export default function ReceiptPrintButton({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);

    try {
      const result = await printOrderReceipt(orderId);

      if (result.success && result.mode === "pdf") {
        toast({
          description: result.message,
        });
      } else if (!result.success) {
        toast({
          variant: "destructive",
          description: result.message,
        });
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Imprimir comprobante"
      disabled={printing}
      onClick={handlePrint}
    >
      {printing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="cursor-pointer" />
      )}
    </Button>
  );
}
