"use client";

import { iminPrinter } from "@/printing/printers/imin/imin-printer";
import { requestIminLocalNetworkAccess } from "@/printing/request-local-network-access";
import {
  getPrintingRuntimeState,
  isFalconPrintingEnabled,
  waitForPrinterInitialization,
} from "@/printing/printing-runtime";
import type {
  PrintFailureReason,
  PrintResult,
  ReceiptPrintData,
} from "@/printing/types";
import { createPrintingToastLogger } from "@/printing/printing-warning-toast";

type PrintDataResponse =
  | {
      success: true;
      data: ReceiptPrintData;
    }
  | {
      success: false;
      message?: string;
    };

export const orderDocumentPdfUrl = (orderId: string) =>
  `/api/orders/${orderId}/documents`;

export const orderPrintDataUrl = (orderId: string) =>
  `/api/orders/${orderId}/print-data`;

const openPdfFallback = (url: string) => {
  window.open(url, "_blank");
};

const pdfFallbackResult = (
  reason: PrintFailureReason,
  message = "Se abrio el comprobante en PDF.",
): PrintResult => ({
  success: true,
  mode: "pdf",
  fallbackReason: reason,
  message,
});

export const printOrderReceipt = async (orderId: string): Promise<PrintResult> => {
  const defaultPdfUrl = orderDocumentPdfUrl(orderId);
  const logger = createPrintingToastLogger("Diagnostico impresion iMin");

  logger.log("Inicio de impresion", {
    orderId,
    runtimeState: getPrintingRuntimeState(),
    falconPrintingEnabled: isFalconPrintingEnabled(),
  });

  if (!isFalconPrintingEnabled()) {
    const localAccess = await requestIminLocalNetworkAccess();
    const logLocalAccess =
      localAccess.status === "blocked" ? logger.fail : logger.log;

    logLocalAccess("Preflight Local Network Access iMin", localAccess);
  }

  if (
    !isFalconPrintingEnabled() &&
    !(await waitForPrinterInitialization())
  ) {
    const runtimeHealth = getPrintingRuntimeState().result?.printers.imin;
    const fallbackReason = runtimeHealth?.reason ?? "sdk_unavailable";

    logger.fail("Runtime iMin no disponible, abriendo PDF", {
      runtimeHealth,
      fallbackReason,
      runtimeState: getPrintingRuntimeState(),
    });
    openPdfFallback(defaultPdfUrl);
    return pdfFallbackResult(
      fallbackReason,
      `${runtimeHealth?.message ?? "Impresora iMin no disponible."} Se abrio el PDF.`,
    );
  }

  let receiptData: ReceiptPrintData;

  try {
    logger.log("Solicitando datos de impresion", {
      url: orderPrintDataUrl(orderId),
    });

    const response = await fetch(orderPrintDataUrl(orderId), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Print data request failed");
    }

    const payload = (await response.json()) as PrintDataResponse;

    if (!payload.success) {
      throw new Error(payload.message ?? "Print data response failed");
    }

    receiptData = payload.data;
    logger.log("Datos de impresion recibidos", {
      document: receiptData.document,
      items: receiptData.order.items.length,
    });
  } catch (error) {
    logger.fail("No se pudieron obtener datos de impresion", {
      error,
    });
    openPdfFallback(defaultPdfUrl);
    return pdfFallbackResult(
      "data_fetch_failed",
      "No se pudo preparar la impresion directa. Se abrio el PDF.",
    );
  }

  const fallbackPdfUrl = receiptData.fallbackPdfUrl || defaultPdfUrl;

  if (!iminPrinter.isAvailable()) {
    logger.fail("Adaptador iMin no disponible antes de imprimir", {
      runtimeState: getPrintingRuntimeState(),
    });
    openPdfFallback(fallbackPdfUrl);
    return pdfFallbackResult(
      "sdk_unavailable",
      "Impresora iMin no disponible. Se abrio el PDF.",
    );
  }

  let printResult: PrintResult;

  try {
    logger.log("Enviando comandos a impresora iMin");
    printResult = await iminPrinter.printReceipt(receiptData, logger.log);
    logger.log("Resultado de impresion iMin", printResult);
  } catch (error) {
    logger.fail("Excepcion durante impresion iMin, abriendo PDF", {
      error,
      runtimeState: getPrintingRuntimeState(),
    });
    openPdfFallback(fallbackPdfUrl);
    return pdfFallbackResult(
      "print_failed",
      "La impresion directa fallo. Se abrio el PDF.",
    );
  }

  if (!printResult.success) {
    logger.fail("La impresora iMin respondio con error, abriendo PDF", {
      printResult,
    });
    openPdfFallback(fallbackPdfUrl);
    return pdfFallbackResult(
      printResult.reason,
      `${printResult.message} Se abrio el PDF.`,
    );
  }

  return printResult;
};
