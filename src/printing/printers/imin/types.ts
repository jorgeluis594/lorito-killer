export type IminPrintConnectType = {
  USB?: string | number;
  BLUETOOTH?: string | number;
  SPI?: string | number;
  SERIAL?: string | number;
};

export type IminPrintCallback<T = unknown> = (result: T) => void;

export type IminMaybeAsync<T = unknown> = Promise<T> | T | void;

export type IminPrintInstance = {
  PrintConnectType?: IminPrintConnectType;
  initPrinter?: (
    connectType?: string | number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  getPrinterStatus?: (
    connectType?: string | number,
    callback?: IminPrintCallback<number>,
  ) => IminMaybeAsync<number>;
  setPageFormat?: (
    format: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  setTextWidth?: (
    width: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  setAlignment?: (
    alignment: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  setTextSize?: (
    size: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  setTextStyle?: (
    style: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  printText?: (text: string, callback?: IminPrintCallback) => IminMaybeAsync;
  printColumnsText?: (
    values: string[],
    widths: number[],
    aligns: number[],
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  setQrCodeSize?: (
    size: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  setQrCodeErrorCorrectionLev?: (
    level: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  printQrCode?: (
    value: string,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  printAndLineFeed?: (callback?: IminPrintCallback) => IminMaybeAsync;
  printAndFeedPaper?: (
    lines: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  partialCut?: (callback?: IminPrintCallback) => IminMaybeAsync;
  partialCutPaper?: (callback?: IminPrintCallback) => IminMaybeAsync;
};

declare global {
  interface Window {
    IminPrintInstance?: IminPrintInstance;
  }
}

export {};
