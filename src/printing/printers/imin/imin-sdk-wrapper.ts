import type {
  PrintAlignment,
  PrintCommand,
  PrintFailureReason,
  PrinterStatus,
} from "@/printing/types";
import type {
  IminMaybeAsync,
  IminPrintCallback,
  IminPrintConnectType,
  IminPrinterConstructor,
  IminPrintInstance,
} from "@/printing/printers/imin/types";
import { notifyPrintingWarning } from "@/printing/printing-warning-toast";

const FALCON_80MM_PAGE_FORMAT = 0;
const FALCON_80MM_TEXT_WIDTH = 576;
const FALCON_QR_SIZE = 6;
const FALCON_QR_ERROR_CORRECTION_LEVEL = 48;
const COMMAND_TIMEOUT_MS = 2_500;
const CONNECTION_TIMEOUT_MS = 3_500;
const IMIN_SDK_SCRIPT_ID = "imin-printer-sdk";
const IMIN_SDK_SCRIPT_SRC = "/vendor/imin-printer/imin-printer.js";

type TextCommandOptions = Pick<
  Extract<PrintCommand, { type: "text" }>,
  "align" | "bold" | "size"
>;

type IminTransport = "official-sdk" | "legacy-window-sdk";

type ResolvedIminSdk = {
  sdk: IminPrintInstance;
  transport: IminTransport;
};

type IminSdkInternalConnectionState = IminPrintInstance & {
  isLock?: boolean;
  h_timer?: number;
  c_timer?: number;
  l_timer?: number;
};

type IminPrinterDebugInfo = {
  page: {
    href?: string;
    protocol?: string;
    userAgent?: string;
  };
  officialSdk: {
    scriptSrc: string;
    scriptPresent: boolean;
    constructorPresent: boolean;
    version?: string;
    instanceCreated: boolean;
    connected: boolean;
    availableMethods: string[];
    connectTypes?: IminPrintConnectType;
    selectedConnectType: string | number;
  };
  windowSdk: {
    present: boolean;
    availableMethods: string[];
    connectTypes?: IminPrintConnectType;
    selectedConnectType: string | number;
  };
  activeTransport?: IminTransport;
};

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

let scriptLoadPromise: Promise<boolean> | undefined;

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

const readyStatus = (message = "Comando iMin ejecutado."): PrinterStatus => ({
  ready: true,
  message,
});

const failedStatus = (
  reason: PrintFailureReason,
  message = messageForPrintFailure(reason),
): PrinterStatus => ({
  ready: false,
  reason,
  message,
});

const isBrowser = (): boolean => typeof window !== "undefined";

const readLegacyWindowSdk = (): IminPrintInstance | undefined => {
  if (!isBrowser()) return undefined;
  return window.IminPrintInstance;
};

const readOfficialConstructor = (): IminPrinterConstructor | undefined => {
  if (!isBrowser()) return undefined;
  return window.IminPrinter;
};

const getWindowDebugInfo = (): IminPrinterDebugInfo["page"] => {
  if (!isBrowser()) return {};

  return {
    href: window.location.href,
    protocol: window.location.protocol,
    userAgent: window.navigator.userAgent,
  };
};

const getSdkMethodNames = (sdk: IminPrintInstance | undefined): string[] => {
  if (!sdk) return [];

  const methodNames = new Set<string>();
  let current: object | null = sdk;

  while (current && current !== Object.prototype) {
    Object.getOwnPropertyNames(current).forEach((key) => {
      if (
        key !== "constructor" &&
        typeof sdk[key as keyof IminPrintInstance] === "function"
      ) {
        methodNames.add(key);
      }
    });
    current = Object.getPrototypeOf(current);
  }

  return Array.from(methodNames).sort();
};

const loadIminPrinterScript = async (): Promise<boolean> => {
  if (!isBrowser()) return false;
  if (readOfficialConstructor()) return true;
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<boolean>((resolve) => {
    const existingScript = document.getElementById(IMIN_SDK_SCRIPT_ID);
    if (existingScript) {
      if ((existingScript as HTMLScriptElement).dataset.loaded === "true") {
        resolve(Boolean(readOfficialConstructor()));
        return;
      }

      const timeout = window.setTimeout(() => {
        resolve(Boolean(readOfficialConstructor()));
      }, COMMAND_TIMEOUT_MS);
      existingScript.addEventListener(
        "load",
        () => {
          window.clearTimeout(timeout);
          resolve(Boolean(readOfficialConstructor()));
        },
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => {
          window.clearTimeout(timeout);
          resolve(false);
        },
        {
          once: true,
        },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = IMIN_SDK_SCRIPT_ID;
    script.src = IMIN_SDK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(Boolean(readOfficialConstructor()));
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  }).finally(() => {
    scriptLoadPromise = undefined;
  });

  return scriptLoadPromise;
};

const normalizeCallbackValue = (value: unknown): unknown => {
  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Object.keys(value).length === 1
  ) {
    return (value as { data: unknown }).data;
  }

  return value;
};

const numericFrom = (value: unknown): number | undefined => {
  const normalized = normalizeCallbackValue(value);

  if (typeof normalized === "number") return normalized;

  if (typeof normalized === "string") {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (!normalized || typeof normalized !== "object") return undefined;

  const objectValue = normalized as Record<string, unknown>;
  return (
    numericFrom(objectValue.value) ??
    numericFrom(objectValue.status) ??
    numericFrom(objectValue.code) ??
    numericFrom(objectValue.result) ??
    numericFrom(objectValue.data)
  );
};

const sdkPromise = async <T>(
  invoke: (callback: IminPrintCallback<T>) => IminMaybeAsync<T>,
): Promise<T | undefined> =>
  new Promise<T | undefined>((resolve, reject) => {
    let settled = false;

    const settle = (value: T | undefined) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const callback: IminPrintCallback<T> = (result) => {
      settle(result);
    };

    try {
      const returned = invoke(callback);

      if (returned && typeof (returned as Promise<T>).then === "function") {
        void (returned as Promise<T>).then(settle, reject);
        return;
      }

      if (returned !== undefined) {
        settle(returned as T);
        return;
      }

      window.setTimeout(() => settle(undefined), COMMAND_TIMEOUT_MS);
    } catch (error) {
      reject(error);
    }
  });

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> => {
  let timeout: number | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = window.setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
};

export class IminSdkWrapper {
  private officialSdk?: IminPrintInstance;
  private officialSdkConnected = false;
  private activeTransport?: IminTransport;

  isAvailable(): boolean {
    return Boolean(
      this.officialSdk ?? readOfficialConstructor() ?? readLegacyWindowSdk(),
    );
  }

  async initialize(): Promise<PrinterStatus> {
    return this.withSdk(async ({ sdk, transport }) => {
      this.requireSdkMethod(sdk, "initPrinter");
      sdk.initPrinter?.(this.connectType(sdk));
      this.activeTransport = transport;
      return readyStatus("Impresora iMin inicializada.");
    });
  }

  async configure80mm(): Promise<PrinterStatus> {
    return this.withSdk(async ({ sdk }) => {
      this.requireSdkMethod(sdk, "setPageFormat");
      this.requireSdkMethod(sdk, "setTextWidth");
      sdk.setPageFormat?.(FALCON_80MM_PAGE_FORMAT);
      sdk.setTextWidth?.(FALCON_80MM_TEXT_WIDTH);
      return readyStatus("Formato iMin 80mm configurado.");
    });
  }

  async getStatus(): Promise<PrinterStatus> {
    return this.withSdk(async ({ sdk }) => {
      this.requireSdkMethod(sdk, "getPrinterStatus");
      const status = await sdkPromise((callback) =>
        sdk.getPrinterStatus?.(this.connectType(sdk), callback),
      );
      return mapIminStatus(numericFrom(status));
    });
  }

  async printText(
    value: string,
    options?: TextCommandOptions,
  ): Promise<PrinterStatus> {
    return this.withSdk(async ({ sdk }) => {
      await this.configureText(sdk, options);
      this.requireSdkMethod(sdk, "printText");
      sdk.printText?.(value);
      return readyStatus();
    });
  }

  async printColumns(
    values: string[],
    widths: number[],
    aligns: PrintAlignment[],
    bold = false,
  ): Promise<PrinterStatus> {
    const sdkAligns = aligns.map((align) => this.sdkAlignmentFor(align));

    return this.withSdk(async ({ sdk }) => {
      this.requireSdkMethod(sdk, "setTextStyle");
      this.requireSdkMethod(sdk, "printColumnsText");
      sdk.setTextStyle?.(bold ? 1 : 0);
      sdk.printColumnsText?.(
        values,
        widths,
        sdkAligns,
        1,
        FALCON_80MM_TEXT_WIDTH,
      );
      return readyStatus();
    });
  }

  async printQr(value: string): Promise<PrinterStatus> {
    return this.withSdk(async ({ sdk }) => {
      this.requireSdkMethod(sdk, "printQrCode");
      sdk.setQrCodeSize?.(FALCON_QR_SIZE);
      sdk.setQrCodeErrorCorrectionLev?.(FALCON_QR_ERROR_CORRECTION_LEVEL);
      sdk.printQrCode?.(value, 1);
      return readyStatus();
    });
  }

  async feed(lines: number): Promise<PrinterStatus> {
    return this.withSdk(async ({ sdk }) => {
      if (sdk.printAndFeedPaper) {
        sdk.printAndFeedPaper(lines);
        return readyStatus();
      }

      this.requireSdkMethod(sdk, "printAndLineFeed");
      for (let index = 0; index < lines; index += 1) {
        sdk.printAndLineFeed?.();
      }
      return readyStatus();
    });
  }

  async cut(): Promise<PrinterStatus> {
    return this.withSdk(async ({ sdk }) => {
      const cutMethod = sdk.partialCut ?? sdk.partialCutPaper;
      if (!cutMethod) return failedStatus("plugin_unavailable");
      cutMethod.call(sdk);
      return readyStatus();
    });
  }

  resetConnection() {
    this.officialSdk?.close?.();
    this.officialSdk = undefined;
    this.officialSdkConnected = false;
    this.activeTransport = undefined;
  }

  sdkAlignmentFor(align: PrintAlignment = "left"): number {
    return alignmentToSdkValue[align];
  }

  getActiveTransport(): IminTransport | undefined {
    return this.activeTransport;
  }

  getDebugInfo(): IminPrinterDebugInfo {
    const officialConstructor = readOfficialConstructor();
    const legacySdk = readLegacyWindowSdk();
    const officialSdk = this.officialSdk;

    return {
      page: getWindowDebugInfo(),
      officialSdk: {
        scriptSrc: IMIN_SDK_SCRIPT_SRC,
        scriptPresent: isBrowser()
          ? Boolean(document.getElementById(IMIN_SDK_SCRIPT_ID))
          : false,
        constructorPresent: Boolean(officialConstructor),
        version: officialConstructor?.version,
        instanceCreated: Boolean(officialSdk),
        connected: this.officialSdkConnected,
        availableMethods: getSdkMethodNames(officialSdk),
        connectTypes: officialConstructor?.PrintConnectType,
        selectedConnectType: this.connectType(officialSdk),
      },
      windowSdk: {
        present: Boolean(legacySdk),
        availableMethods: getSdkMethodNames(legacySdk),
        connectTypes: legacySdk?.PrintConnectType,
        selectedConnectType: this.connectType(legacySdk),
      },
      activeTransport: this.activeTransport,
    };
  }

  private async resolveSdk(): Promise<ResolvedIminSdk | undefined> {
    const officialSdk = await this.getOfficialSdk();
    if (officialSdk) {
      await this.ensureOfficialSdkConnected(officialSdk);
      this.activeTransport = "official-sdk";
      return {
        sdk: officialSdk,
        transport: "official-sdk",
      };
    }

    const legacySdk = readLegacyWindowSdk();
    if (!legacySdk) return undefined;

    this.activeTransport = "legacy-window-sdk";
    return {
      sdk: legacySdk,
      transport: "legacy-window-sdk",
    };
  }

  private async getOfficialSdk(): Promise<IminPrintInstance | undefined> {
    if (this.officialSdk) return this.officialSdk;

    const loaded = await loadIminPrinterScript();
    if (!loaded) return undefined;

    const IminPrinter = readOfficialConstructor();
    if (!IminPrinter) return undefined;

    this.officialSdk = new IminPrinter();
    return this.officialSdk;
  }

  private async ensureOfficialSdkConnected(sdk: IminPrintInstance) {
    this.requireSdkMethod(sdk, "connect");

    if (this.officialSdkConnected && sdk.ws?.readyState === 1) return;

    const connected = await withTimeout(
      sdk.connect?.() ?? Promise.resolve(false),
      CONNECTION_TIMEOUT_MS,
      `iMin SDK connect() timed out after ${CONNECTION_TIMEOUT_MS}ms`,
    ).catch((error) => {
      this.stopOfficialSdkReconnect(sdk);
      throw error;
    });

    if (!connected) {
      this.officialSdkConnected = false;
      this.stopOfficialSdkReconnect(sdk);
      throw new Error("iMin SDK connect() returned false");
    }

    this.officialSdkConnected = true;
  }

  private stopOfficialSdkReconnect(sdk: IminPrintInstance) {
    const internalSdk = sdk as IminSdkInternalConnectionState;

    internalSdk.isLock = true;
    if (internalSdk.h_timer) window.clearTimeout(internalSdk.h_timer);
    if (internalSdk.c_timer) window.clearTimeout(internalSdk.c_timer);
    if (internalSdk.l_timer) window.clearTimeout(internalSdk.l_timer);
    sdk.close?.();
    this.officialSdkConnected = false;
  }

  private connectType(sdk?: IminPrintInstance): string | number {
    return sdk?.PrintConnectType?.SPI ?? "SPI";
  }

  private async configureText(
    sdk: IminPrintInstance,
    options: TextCommandOptions | undefined,
  ) {
    this.requireSdkMethod(sdk, "setAlignment");
    this.requireSdkMethod(sdk, "setTextSize");
    this.requireSdkMethod(sdk, "setTextStyle");

    sdk.setAlignment?.(this.sdkAlignmentFor(options?.align));
    sdk.setTextSize?.(options?.size ?? 1);
    sdk.setTextStyle?.(options?.bold ? 1 : 0);
  }

  private requireSdkMethod<K extends keyof IminPrintInstance>(
    sdk: IminPrintInstance,
    method: K,
  ) {
    if (typeof sdk[method] !== "function") {
      throw new Error(`iMin SDK method is unavailable: ${String(method)}`);
    }
  }

  private async withSdk(
    action: (resolvedSdk: ResolvedIminSdk) => Promise<PrinterStatus>,
  ): Promise<PrinterStatus> {
    let resolvedSdk: ResolvedIminSdk | undefined;

    try {
      resolvedSdk = await this.resolveSdk();
    } catch (error) {
      notifyPrintingWarning("iMin SDK connection failed", {
        error,
        debug: this.getDebugInfo(),
      });
      return failedStatus("plugin_unavailable");
    }

    if (!resolvedSdk) {
      notifyPrintingWarning("iMin SDK unavailable", {
        debug: this.getDebugInfo(),
      });
      return failedStatus("sdk_unavailable");
    }

    try {
      return await action(resolvedSdk);
    } catch (error) {
      notifyPrintingWarning("iMin SDK command failed", {
        error,
        debug: this.getDebugInfo(),
      });
      return failedStatus("plugin_unavailable");
    }
  }
}

export const iminSdkWrapper = new IminSdkWrapper();

export const getIminPrinterDebugInfo = (): IminPrinterDebugInfo =>
  iminSdkWrapper.getDebugInfo();
