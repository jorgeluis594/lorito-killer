export type IminPrintConnectType = {
  USB?: string | number;
  BLUETOOTH?: string | number;
  Bluetooth?: string | number;
  SPI?: string | number;
  SERIAL?: string | number;
};

export type IminPrintCallback<T = unknown> = (result: T) => void;

export type IminMaybeAsync<T = unknown> = Promise<T> | T | void;

export type IminPrintColumnsText = {
  (
    values: string[],
    widths: number[],
    aligns: number[],
    callback?: IminPrintCallback,
  ): IminMaybeAsync;
  (
    values: string[],
    widths: number[],
    aligns: number[],
    size: number[],
    width: number,
    callback?: IminPrintCallback,
  ): IminMaybeAsync;
};

export type IminPrintInstance = {
  PrintConnectType?: IminPrintConnectType;
  connect?: () => Promise<boolean>;
  close?: () => void;
  ws?: WebSocket | null;
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
  setTextSize?: (size: number, callback?: IminPrintCallback) => IminMaybeAsync;
  setTextStyle?: (
    style: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  printText?: (text: string, callback?: IminPrintCallback) => IminMaybeAsync;
  printColumnsText?: IminPrintColumnsText;
  setQrCodeSize?: (
    size: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  setQrCodeErrorCorrectionLev?: (
    level: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  printQrCode?: {
    (value: string, callback?: IminPrintCallback): IminMaybeAsync;
    (
      value: string,
      alignmentMode: number,
      callback?: IminPrintCallback,
    ): IminMaybeAsync;
  };
  printAndLineFeed?: (callback?: IminPrintCallback) => IminMaybeAsync;
  printAndFeedPaper?: (
    lines: number,
    callback?: IminPrintCallback,
  ) => IminMaybeAsync;
  partialCut?: (callback?: IminPrintCallback) => IminMaybeAsync;
  partialCutPaper?: (callback?: IminPrintCallback) => IminMaybeAsync;
};

export type IminPrinterConstructor = {
  new (url?: string): IminPrintInstance;
  version?: string;
  connect_type?: string | number;
  PrintConnectType?: IminPrintConnectType;
};

declare global {
  interface Window {
    IminPrinter?: IminPrinterConstructor;
    IminPrintInstance?: IminPrintInstance;
  }
}

export {};
