import type {
  PrintCommand,
  PrintFailureReason,
  PrintResult,
  PrinterAdapter,
  PrinterStatus,
  ReceiptPrintData,
} from "@/printing/types";
import {
  iminSdkWrapper,
  messageForPrintFailure,
} from "@/printing/printers/imin/imin-sdk-wrapper";
import { buildThermalReceiptCommands } from "@/printing/printers/imin/thermal-receipt-renderer";

const failedResult = (
  reason: PrintFailureReason,
  message = messageForPrintFailure(reason),
): PrintResult => ({
  success: false,
  mode: "imin",
  reason,
  message,
});

const statusToResult = (status: PrinterStatus): PrintResult =>
  failedResult(status.reason ?? "printer_unknown_error", status.message);

const ensureReady = (status: PrinterStatus): PrintResult | undefined => {
  if (status.ready) return undefined;
  return statusToResult(status);
};

const executeCommand = async (
  command: PrintCommand,
): Promise<PrinterStatus> => {
  switch (command.type) {
    case "text":
      return iminSdkWrapper.printText(command.value, {
        align: command.align,
        bold: command.bold,
        size: command.size,
      });
    case "columns":
      return iminSdkWrapper.printColumns(
        command.values,
        command.widths,
        command.aligns,
      );
    case "qr":
      return iminSdkWrapper.printQr(command.value);
    case "feed":
      return iminSdkWrapper.feed(command.lines);
    case "cut":
      return iminSdkWrapper.cut();
  }
};

export const iminPrinter: PrinterAdapter = {
  isAvailable: () => iminSdkWrapper.isAvailable(),

  async printReceipt(data: ReceiptPrintData): Promise<PrintResult> {
    if (!iminSdkWrapper.isAvailable()) {
      return failedResult("sdk_unavailable");
    }

    const initResult = ensureReady(await iminSdkWrapper.initialize());
    if (initResult) return initResult;

    const configResult = ensureReady(await iminSdkWrapper.configure80mm());
    if (configResult) return configResult;

    const statusResult = ensureReady(await iminSdkWrapper.getStatus());
    if (statusResult) return statusResult;

    let commands: PrintCommand[];
    try {
      commands = buildThermalReceiptCommands(data);
    } catch {
      return failedResult("render_failed");
    }

    for (const command of commands) {
      const commandStatus = ensureReady(await executeCommand(command));
      if (commandStatus) return commandStatus;
    }

    return {
      success: true,
      mode: "imin",
      message: "Comprobante impreso en iMin.",
    };
  },
};

export const isIminPrinterAvailable = (): boolean => iminPrinter.isAvailable();

export const printReceipt = (data: ReceiptPrintData): Promise<PrintResult> =>
  iminPrinter.printReceipt(data);
