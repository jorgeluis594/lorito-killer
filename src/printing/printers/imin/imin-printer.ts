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
import { initPrinters } from "@/printing/init-printers";
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
        command.bold,
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

  initialize: () =>
    initPrinters().then((result) => {
      const health = result.printers.imin;
      return {
        ready: health.ready,
        reason: health.reason,
        message: health.message,
      };
    }),

  getStatus: () => iminSdkWrapper.getStatus(),

  async printReceipt(data: ReceiptPrintData): Promise<PrintResult> {
    const initResult = ensureReady(await this.initialize!());
    if (initResult) return initResult;

    const statusResult = ensureReady(await iminSdkWrapper.getStatus());
    if (statusResult) return statusResult;

    let commands: PrintCommand[];
    try {
      commands = buildThermalReceiptCommands(data);
    } catch {
      return failedResult("render_failed");
    }

    for (const command of commands) {
      const rawCommandStatus = await executeCommand(command);
      const commandStatus = ensureReady(rawCommandStatus);
      if (commandStatus) {
        if (command.type === "cut") {
          console.warn("iMin receipt printed, but paper cut failed", rawCommandStatus);
          continue;
        }

        return commandStatus;
      }
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
