import type {
  PrintAlignment,
  PrintCommand,
  PrintFailureReason,
  PrinterStatus,
} from "@/printing/types";

const FALCON_80MM_PAGE_FORMAT = 0;
const FALCON_80MM_TEXT_WIDTH = 576;

type TextCommandOptions = Pick<
  Extract<PrintCommand, { type: "text" }>,
  "align" | "bold" | "size"
>;

const alignmentToSdkValue: Record<PrintAlignment, number> = {
  left: 0,
  center: 1,
  right: 2,
};

const printerStatusReason: Record<number, PrintFailureReason> = {
  [-1]: "printer_not_connected",
  1: "printer_not_connected",
  3: "printer_head_open",
  7: "paper_out",
  8: "paper_low",
  99: "printer_unknown_error",
};

const printerStatusMessage: Record<PrintFailureReason, string> = {
  sdk_unavailable: "El SDK de iMin no esta disponible en este navegador.",
  plugin_unavailable: "El plugin de impresion iMin no esta disponible.",
  printer_not_connected: "La impresora iMin no esta conectada.",
  printer_head_open: "La tapa de la impresora iMin esta abierta.",
  paper_out: "La impresora iMin no tiene papel.",
  paper_low: "La impresora iMin tiene poco papel.",
  printer_unknown_error: "La impresora iMin reporto un error desconocido.",
  data_fetch_failed: "No se pudo obtener la informacion para imprimir.",
  render_failed: "No se pudo preparar el comprobante para impresion termica.",
  print_failed: "No se pudo imprimir el comprobante en la impresora iMin.",
};

export const messageForPrintFailure = (reason: PrintFailureReason): string =>
  printerStatusMessage[reason];

export const mapIminStatus = (status?: number): PrinterStatus => {
  if (status === 0) {
    return {
      code: status,
      ready: true,
      message: "La impresora iMin esta lista.",
    };
  }

  const reason =
    typeof status === "number"
      ? printerStatusReason[status] ?? "printer_unknown_error"
      : "printer_unknown_error";

  return {
    code: status,
    ready: false,
    reason,
    message: messageForPrintFailure(reason),
  };
};

export class IminSdkWrapper {
  isAvailable(): boolean {
    return false;
  }

  async initialize(): Promise<PrinterStatus> {
    return {
      ready: false,
      reason: "sdk_unavailable",
      message: messageForPrintFailure("sdk_unavailable"),
    };
  }

  async configure80mm(): Promise<PrinterStatus> {
    void FALCON_80MM_PAGE_FORMAT;
    void FALCON_80MM_TEXT_WIDTH;

    return {
      ready: false,
      reason: "sdk_unavailable",
      message: messageForPrintFailure("sdk_unavailable"),
    };
  }

  async getStatus(): Promise<PrinterStatus> {
    return {
      ready: false,
      reason: "sdk_unavailable",
      message: messageForPrintFailure("sdk_unavailable"),
    };
  }

  async printText(
    _value: string,
    _options?: TextCommandOptions,
  ): Promise<PrinterStatus> {
    return this.unavailable();
  }

  async printColumns(
    _values: string[],
    _widths: number[],
    _aligns: PrintAlignment[],
  ): Promise<PrinterStatus> {
    return this.unavailable();
  }

  async printQr(_value: string): Promise<PrinterStatus> {
    return this.unavailable();
  }

  async feed(_lines: number): Promise<PrinterStatus> {
    return this.unavailable();
  }

  async cut(): Promise<PrinterStatus> {
    return this.unavailable();
  }

  sdkAlignmentFor(align: PrintAlignment = "left"): number {
    return alignmentToSdkValue[align];
  }

  private unavailable(): PrinterStatus {
    return {
      ready: false,
      reason: "sdk_unavailable",
      message: messageForPrintFailure("sdk_unavailable"),
    };
  }
}

export const iminSdkWrapper = new IminSdkWrapper();
