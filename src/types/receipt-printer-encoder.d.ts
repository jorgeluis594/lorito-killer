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
    line(value: string): this;
    rule(options?: { style?: "single" | "double" }): this;
    cut(type?: "full" | "partial"): this;
    encode(): Uint8Array;
  }
}
