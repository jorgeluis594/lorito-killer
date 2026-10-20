declare module "@point-of-sale/receipt-printer-encoder" {
  export default class ReceiptPrinterEncoder {
    constructor(options?: {
      columns?: number;
      codepageMapping?: string;
      feedBeforeCut?: number;
    });
    initialize(): this;
    align(value: "left" | "center" | "right"): this;
    bold(value?: boolean): this;
    width(value: number): this;
    height(value: number): this;
    line(value: string): this;
    newline(lines?: number): this;
    qrcode(value: string): this;
    rule(options?: { style?: "single" | "double" }): this;
    cut(type?: "full" | "partial"): this;
    encode(): Uint8Array;
  }
}
