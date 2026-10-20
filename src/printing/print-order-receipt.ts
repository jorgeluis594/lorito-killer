"use client";

import { printTaxDocument } from "@/printing/actions";
import type { PrintResult } from "@/printing/types";

export const orderDocumentPdfUrl = (orderId: string) =>
  `/api/orders/${orderId}/documents`;

/** El error de impresión llega después por realtime; aquí solo se encola o se abre el PDF. */
export const printOrderReceipt = async (
  orderId: string,
): Promise<PrintResult> => {
  const result = await printTaxDocument(orderId);
  if (!result.success) return { success: false, message: result.message };
  if (result.data.mode === "gateway") return { success: true, mode: "gateway" };
  // Llega después de un await, fuera del clic: el navegador puede bloquear la ventana.
  if (!window.open(orderDocumentPdfUrl(orderId), "_blank"))
    return {
      success: false,
      message:
        "El navegador bloqueó el PDF. Permite ventanas emergentes para este sitio y vuelve a imprimir.",
    };
  return {
    success: true,
    mode: "pdf",
    message: "Se abrio el comprobante en PDF.",
  };
};
