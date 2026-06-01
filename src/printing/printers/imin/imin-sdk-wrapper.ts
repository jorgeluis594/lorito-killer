import type {
  PrintAlignment,
  PrintCommand,
  PrintFailureReason,
  PrinterStatus,
} from "@/printing/types";
import type {
  IminPrintConnectType,
  IminMaybeAsync,
  IminPrintCallback,
  IminPrintInstance,
} from "@/printing/printers/imin/types";
import { notifyPrintingWarning } from "@/printing/printing-warning-toast";

const FALCON_80MM_PAGE_FORMAT = 0;
const FALCON_80MM_TEXT_WIDTH = 576;
const FALCON_QR_SIZE = 6;
const FALCON_QR_ERROR_CORRECTION_LEVEL = 48;
const IMIN_WEBSOCKET_URL = "ws://127.0.0.1:8081/websocket";
const COMMAND_TIMEOUT_MS = 2_500;
const CONNECT_TIMEOUT_MS = 1_500;
const IMIN_WEBSOCKET_CONTRACT_LOG_PREFIX = "[iMin WebSocket contract]";

type TextCommandOptions = Pick<
  Extract<PrintCommand, { type: "text" }>,
  "align" | "bold" | "size"
>;

type IminTransport = "window-sdk" | "websocket";

type WebSocketConstructor = new (url: string) => WebSocket;

type WebSocketResponse = {
  id?: number;
  result?: unknown;
  data?: unknown;
  status?: unknown;
  code?: unknown;
  value?: unknown;
  error?: unknown;
  message?: unknown;
};

type IminPrinterDebugInfo = {
  page: {
    href?: string;
    protocol?: string;
    userAgent?: string;
  };
  windowSdk: {
    present: boolean;
    availableMethods: string[];
    connectTypes?: IminPrintConnectType;
    selectedConnectType: string | number;
  };
  websocket: {
    constructorAvailable: boolean;
    url: string;
    activeTransport?: IminTransport;
  };
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

const readWindowSdk = (): IminPrintInstance | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.IminPrintInstance;
};

const getWebSocketConstructor = (): WebSocketConstructor | undefined => {
  const candidate = globalThis.WebSocket;
  return typeof candidate === "function"
    ? (candidate as unknown as WebSocketConstructor)
    : undefined;
};

const getWindowDebugInfo = (): IminPrinterDebugInfo["page"] => {
  if (typeof window === "undefined") return {};

  return {
    href: window.location.href,
    protocol: window.location.protocol,
    userAgent: window.navigator.userAgent,
  };
};

const getSdkMethodNames = (sdk: IminPrintInstance | undefined): string[] => {
  if (!sdk) return [];

  const sdkRecord = sdk as Record<string, unknown>;
  return Object.keys(sdkRecord)
    .filter((key) => typeof sdkRecord[key] === "function")
    .sort();
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

const statusFromCommandValue = (value: unknown): PrinterStatus => {
  const statusCode = numericFrom(value);
  if (statusCode === undefined) {
    if (value !== undefined) {
      notifyPrintingWarning(
        `${IMIN_WEBSOCKET_CONTRACT_LOG_PREFIX} Command response did not include a numeric status code.`,
        {
          response: value,
          expectedShapes: [
            0,
            { value: 0 },
            { result: { value: 0 } },
            { data: { value: 0 } },
            { status: { value: 0 } },
          ],
        },
      );
    }

    return readyStatus();
  }

  if (statusCode === 0) return readyStatus();
  return mapIminStatus(statusCode);
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

class IminWebSocketClient {
  private socket?: WebSocket;
  private connectPromise?: Promise<WebSocket>;
  private nextRequestId = 1;
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
      timeout: ReturnType<typeof setTimeout>;
      method: string;
      params: unknown[];
    }
  >();

  constructor(
    private readonly url = IMIN_WEBSOCKET_URL,
    private readonly WebSocketImpl = getWebSocketConstructor(),
  ) {}

  isAvailable(): boolean {
    return Boolean(this.WebSocketImpl);
  }

  disconnect() {
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(new Error("iMin websocket disconnected"));
    });
    this.pendingRequests.clear();

    this.socket?.close();
    this.socket = undefined;
    this.connectPromise = undefined;
  }

  async command(method: string, params: unknown[] = []): Promise<unknown> {
    const socket = await this.connect();
    const id = this.nextRequestId++;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        notifyPrintingWarning(
          `${IMIN_WEBSOCKET_CONTRACT_LOG_PREFIX} Command timed out waiting for a response with matching id.`,
          {
            request: payload,
            expectedResponseShapes: [
              { id, result: { value: 0 } },
              { id, data: { value: 0 } },
              { id, status: { value: 0 } },
              { id, value: 0 },
            ],
          },
        );
        reject(new Error(`iMin websocket command timed out: ${method}`));
      }, COMMAND_TIMEOUT_MS);

      this.pendingRequests.set(id, { resolve, reject, timeout, method, params });

      socket.send(JSON.stringify(payload));
    });
  }

  private async connect(): Promise<WebSocket> {
    if (this.socket?.readyState === 1) return this.socket;
    if (this.connectPromise) return this.connectPromise;

    if (!this.WebSocketImpl) {
      throw new Error("WebSocket is not available");
    }

    const WebSocketImpl = this.WebSocketImpl;

    this.connectPromise = new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocketImpl(this.url);
      const timeout = setTimeout(() => {
        cleanup();
        socket.close();
        reject(new Error("iMin websocket connection timed out"));
      }, CONNECT_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timeout);
        socket.removeEventListener("open", handleOpen);
        socket.removeEventListener("error", handleError);
      };

      const handleOpen = () => {
        cleanup();
        this.socket = socket;
        socket.addEventListener("message", this.handleMessage);
        socket.addEventListener("close", this.handleClose);
        socket.addEventListener("error", this.handleClose);
        resolve(socket);
      };

      const handleError = () => {
        cleanup();
        reject(new Error("iMin websocket connection failed"));
      };

      socket.addEventListener("open", handleOpen);
      socket.addEventListener("error", handleError);
    }).finally(() => {
      this.connectPromise = undefined;
    });

    return this.connectPromise;
  }

  private handleClose = () => {
    this.socket = undefined;
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(new Error("iMin websocket connection closed"));
    });
    this.pendingRequests.clear();
  };

  private handleMessage = (event: MessageEvent) => {
    const response = this.parseResponse(event.data);
    if (!response) {
      notifyPrintingWarning(
        `${IMIN_WEBSOCKET_CONTRACT_LOG_PREFIX} Received a non-JSON or unsupported response.`,
        {
          rawResponse: event.data,
        },
      );
      return;
    }

    const id = typeof response.id === "number" ? response.id : undefined;
    if (id === undefined) {
      notifyPrintingWarning(
        `${IMIN_WEBSOCKET_CONTRACT_LOG_PREFIX} Received a response without numeric id.`,
        {
          response,
          pendingRequests: Array.from(this.pendingRequests.values()).map(
            ({ method, params }) => ({ method, params }),
          ),
        },
      );
      return;
    }

    const request = this.pendingRequests.get(id);
    if (!request) {
      notifyPrintingWarning(
        `${IMIN_WEBSOCKET_CONTRACT_LOG_PREFIX} Received a response for an unknown id.`,
        {
          response,
          pendingRequestIds: Array.from(this.pendingRequests.keys()),
        },
      );
      return;
    }

    clearTimeout(request.timeout);
    this.pendingRequests.delete(id);

    if (response.error) {
      notifyPrintingWarning(
        `${IMIN_WEBSOCKET_CONTRACT_LOG_PREFIX} Service returned an error response.`,
        {
          request: {
            id,
            method: request.method,
            params: request.params,
          },
          response,
        },
      );
      request.reject(response.error);
      return;
    }

    request.resolve(
      response.result ??
        response.data ??
        response.status ??
        response.code ??
        response.value ??
        response,
    );
  };

  private parseResponse(data: unknown): WebSocketResponse | undefined {
    if (typeof data !== "string") return undefined;

    try {
      return JSON.parse(data) as WebSocketResponse;
    } catch {
      return undefined;
    }
  }
}

export class IminSdkWrapper {
  private websocketClient?: IminWebSocketClient;
  private activeTransport?: IminTransport;

  isAvailable(): boolean {
    return Boolean(readWindowSdk()) || this.activeTransport === "websocket";
  }

  async initialize(): Promise<PrinterStatus> {
    const sdk = readWindowSdk();
    if (sdk) {
      return this.withWindowSdk(async () => {
        this.requireSdkMethod(sdk, "initPrinter");
        await sdkPromise((callback) =>
          sdk.initPrinter?.(this.connectType(sdk), callback),
        );
        this.activeTransport = "window-sdk";
        return readyStatus("Impresora iMin inicializada.");
      });
    }

    return this.withWebSocket(async (client) => {
      await client.command("initPrinter", [this.connectType()]);
      this.activeTransport = "websocket";
      return readyStatus("Impresora iMin inicializada.");
    });
  }

  async configure80mm(): Promise<PrinterStatus> {
    const sdk = readWindowSdk();
    if (sdk) {
      return this.withWindowSdk(async () => {
        this.requireSdkMethod(sdk, "setPageFormat");
        this.requireSdkMethod(sdk, "setTextWidth");
        await sdkPromise((callback) =>
          sdk.setPageFormat?.(FALCON_80MM_PAGE_FORMAT, callback),
        );
        await sdkPromise((callback) =>
          sdk.setTextWidth?.(FALCON_80MM_TEXT_WIDTH, callback),
        );
        return readyStatus("Formato iMin 80mm configurado.");
      });
    }

    return this.withWebSocket(async (client) => {
      await client.command("setPageFormat", [FALCON_80MM_PAGE_FORMAT]);
      await client.command("setTextWidth", [FALCON_80MM_TEXT_WIDTH]);
      return readyStatus("Formato iMin 80mm configurado.");
    });
  }

  async getStatus(): Promise<PrinterStatus> {
    const sdk = readWindowSdk();
    if (sdk) {
      return this.withWindowSdk(async () => {
        this.requireSdkMethod(sdk, "getPrinterStatus");
        const status = await sdkPromise<number>((callback) =>
          sdk.getPrinterStatus?.(this.connectType(sdk), callback),
        );
        return mapIminStatus(numericFrom(status));
      });
    }

    return this.withWebSocket(async (client) => {
      const status = await client.command("getPrinterStatus", [
        this.connectType(),
      ]);
      return mapIminStatus(numericFrom(status));
    });
  }

  async printText(
    value: string,
    options?: TextCommandOptions,
  ): Promise<PrinterStatus> {
    const sdk = readWindowSdk();
    if (sdk) {
      return this.withWindowSdk(async () => {
        await this.configureText(sdk, options);
        this.requireSdkMethod(sdk, "printText");
        const result = await sdkPromise((callback) =>
          sdk.printText?.(`${value}\n`, callback),
        );
        return statusFromCommandValue(result);
      });
    }

    return this.withWebSocket(async (client) => {
      await client.command("setAlignment", [
        this.sdkAlignmentFor(options?.align),
      ]);
      await client.command("setTextSize", [options?.size ?? 1]);
      await client.command("setTextStyle", [options?.bold ? 1 : 0]);
      return statusFromCommandValue(
        await client.command("printText", [`${value}\n`]),
      );
    });
  }

  async printColumns(
    values: string[],
    widths: number[],
    aligns: PrintAlignment[],
    bold = false,
  ): Promise<PrinterStatus> {
    const sdkAligns = aligns.map((align) => this.sdkAlignmentFor(align));
    const sdk = readWindowSdk();
    if (sdk) {
      return this.withWindowSdk(async () => {
        this.requireSdkMethod(sdk, "setTextStyle");
        this.requireSdkMethod(sdk, "printColumnsText");
        await sdkPromise((callback) => sdk.setTextStyle?.(bold ? 1 : 0, callback));
        const result = await sdkPromise((callback) =>
          sdk.printColumnsText?.(values, widths, sdkAligns, callback),
        );
        return statusFromCommandValue(result);
      });
    }

    return this.withWebSocket(async (client) => {
      await client.command("setTextStyle", [bold ? 1 : 0]);
      return statusFromCommandValue(
        await client.command("printColumnsText", [
          values,
          widths,
          sdkAligns,
          FALCON_80MM_TEXT_WIDTH,
          1,
        ]),
      );
    });
  }

  async printQr(value: string): Promise<PrinterStatus> {
    const sdk = readWindowSdk();
    if (sdk) {
      return this.withWindowSdk(async () => {
        this.requireSdkMethod(sdk, "printQrCode");
        if (sdk.setQrCodeSize) {
          await sdkPromise((callback) =>
            sdk.setQrCodeSize?.(FALCON_QR_SIZE, callback),
          );
        }
        if (sdk.setQrCodeErrorCorrectionLev) {
          await sdkPromise((callback) =>
            sdk.setQrCodeErrorCorrectionLev?.(
              FALCON_QR_ERROR_CORRECTION_LEVEL,
              callback,
            ),
          );
        }
        const result = await sdkPromise((callback) =>
          sdk.printQrCode?.(value, callback),
        );
        return statusFromCommandValue(result);
      });
    }

    return this.withWebSocket(async (client) => {
      await client.command("setQrCodeSize", [FALCON_QR_SIZE]);
      await client.command("setQrCodeErrorCorrectionLev", [
        FALCON_QR_ERROR_CORRECTION_LEVEL,
      ]);
      return statusFromCommandValue(await client.command("printQrCode", [value]));
    });
  }

  async feed(lines: number): Promise<PrinterStatus> {
    const sdk = readWindowSdk();
    if (sdk) {
      return this.withWindowSdk(async () => {
        if (sdk.printAndFeedPaper) {
          return statusFromCommandValue(
            await sdkPromise((callback) =>
              sdk.printAndFeedPaper?.(lines, callback),
            ),
          );
        }

        this.requireSdkMethod(sdk, "printAndLineFeed");
        for (let index = 0; index < lines; index += 1) {
          const result = await sdkPromise((callback) =>
            sdk.printAndLineFeed?.(callback),
          );
          const status = statusFromCommandValue(result);
          if (!status.ready) return status;
        }
        return readyStatus();
      });
    }

    return this.withWebSocket(async (client) =>
      statusFromCommandValue(await client.command("printAndFeedPaper", [lines])),
    );
  }

  async cut(): Promise<PrinterStatus> {
    const sdk = readWindowSdk();
    if (sdk) {
      return this.withWindowSdk(async () => {
        const cutMethod = sdk.partialCut ?? sdk.partialCutPaper;
        if (!cutMethod) return failedStatus("plugin_unavailable");
        const result = await sdkPromise((callback) => cutMethod.call(sdk, callback));
        return statusFromCommandValue(result);
      });
    }

    return this.withWebSocket(async (client) =>
      statusFromCommandValue(await client.command("partialCut", [])),
    );
  }

  resetConnection() {
    this.websocketClient?.disconnect();
    this.websocketClient = undefined;
    this.activeTransport = undefined;
  }

  sdkAlignmentFor(align: PrintAlignment = "left"): number {
    return alignmentToSdkValue[align];
  }

  getActiveTransport(): IminTransport | undefined {
    return this.activeTransport;
  }

  getDebugInfo(): IminPrinterDebugInfo {
    const sdk = readWindowSdk();

    return {
      page: getWindowDebugInfo(),
      windowSdk: {
        present: Boolean(sdk),
        availableMethods: getSdkMethodNames(sdk),
        connectTypes: sdk?.PrintConnectType,
        selectedConnectType: this.connectType(sdk),
      },
      websocket: {
        constructorAvailable: Boolean(getWebSocketConstructor()),
        url: IMIN_WEBSOCKET_URL,
        activeTransport: this.activeTransport,
      },
    };
  }

  private getWebSocketClient(): IminWebSocketClient {
    this.websocketClient ??= new IminWebSocketClient();
    return this.websocketClient;
  }

  private connectType(sdk?: IminPrintInstance): string | number {
    return sdk?.PrintConnectType?.USB ?? "USB";
  }

  private async configureText(
    sdk: IminPrintInstance,
    options: TextCommandOptions | undefined,
  ) {
    this.requireSdkMethod(sdk, "setAlignment");
    this.requireSdkMethod(sdk, "setTextSize");
    this.requireSdkMethod(sdk, "setTextStyle");

    await sdkPromise((callback) =>
      sdk.setAlignment?.(this.sdkAlignmentFor(options?.align), callback),
    );
    await sdkPromise((callback) =>
      sdk.setTextSize?.(options?.size ?? 1, callback),
    );
    await sdkPromise((callback) =>
      sdk.setTextStyle?.(options?.bold ? 1 : 0, callback),
    );
  }

  private requireSdkMethod<K extends keyof IminPrintInstance>(
    sdk: IminPrintInstance,
    method: K,
  ) {
    if (typeof sdk[method] !== "function") {
      throw new Error(`iMin SDK method is unavailable: ${String(method)}`);
    }
  }

  private async withWindowSdk(
    action: () => Promise<PrinterStatus>,
  ): Promise<PrinterStatus> {
    try {
      return await action();
    } catch (error) {
      notifyPrintingWarning("iMin window SDK command failed", {
        error,
        debug: this.getDebugInfo(),
      });
      return failedStatus("plugin_unavailable");
    }
  }

  private async withWebSocket(
    action: (client: IminWebSocketClient) => Promise<PrinterStatus>,
  ): Promise<PrinterStatus> {
    const client = this.getWebSocketClient();
    if (!client.isAvailable()) {
      notifyPrintingWarning("iMin websocket SDK unavailable", {
        debug: this.getDebugInfo(),
      });
      return failedStatus("sdk_unavailable");
    }

    try {
      return await action(client);
    } catch (error) {
      notifyPrintingWarning("iMin websocket command failed", {
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
