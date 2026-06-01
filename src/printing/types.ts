import type { CustomerDocumentType } from "@/customer/types";
import type { DocumentStatus, DocumentType } from "@/document/types";
import type { PaymentMethod } from "@/order/types";
import type { KG_UNIT_TYPE, UNIT_UNIT_TYPE } from "@/product/types";

type UnitType = typeof KG_UNIT_TYPE | typeof UNIT_UNIT_TYPE;

export type PrintFailureReason =
  | "sdk_unavailable"
  | "plugin_unavailable"
  | "printer_not_connected"
  | "printer_head_open"
  | "paper_out"
  | "paper_low"
  | "printer_unknown_error"
  | "data_fetch_failed"
  | "render_failed"
  | "print_failed";

export type PrintMode = "imin" | "pdf";

export type PrinterId = "imin";

export type PrinterInitializationStatus = "ready" | "unavailable" | "error";

export type PrintResult =
  | {
      success: true;
      mode: "imin";
      message?: string;
    }
  | {
      success: true;
      mode: "pdf";
      fallbackReason?: PrintFailureReason;
      message: string;
    }
  | {
      success: false;
      mode: PrintMode;
      reason: PrintFailureReason;
      message: string;
    };

export type PrinterAdapter = {
  isAvailable: () => boolean;
  initialize?: () => Promise<PrinterStatus>;
  getStatus?: () => Promise<PrinterStatus>;
  printReceipt: (data: ReceiptPrintData) => Promise<PrintResult>;
};

export type PrintAlignment = "left" | "center" | "right";

export type PrinterStatus = {
  code?: number;
  ready: boolean;
  reason?: PrintFailureReason;
  message: string;
};

export type PrinterHealth = {
  id: PrinterId;
  status: PrinterInitializationStatus;
  ready: boolean;
  reason?: PrintFailureReason;
  message: string;
};

export type PrintersInitializationResult = {
  initializedAt: string;
  printers: Record<PrinterId, PrinterHealth>;
};

export type PrintCommand =
  | {
      type: "text";
      value: string;
      align?: PrintAlignment;
      size?: number;
      bold?: boolean;
    }
  | {
      type: "columns";
      values: string[];
      widths: number[];
      aligns: PrintAlignment[];
      bold?: boolean;
    }
  | {
      type: "qr";
      value: string;
    }
  | {
      type: "feed";
      lines: number;
    }
  | {
      type: "cut";
    };

export type ReceiptPrintData = {
  company: {
    commercialName?: string;
    legalName?: string;
    ruc?: string;
    address?: string;
    location?: string;
    email?: string;
    phone?: string;
    logoUrl?: string;
  };
  document: {
    type: DocumentType;
    series: string;
    number: string;
    correlative: string;
    dateOfIssue: string;
    status: DocumentStatus;
    cancellationReason?: string;
    qr?: string;
    hash?: string;
    xml?: string;
    issuedToTaxEntity?: boolean;
    issuedAt?: string;
    netTotal: number;
    discountAmount: number;
    total: number;
  };
  customer?: {
    name: string;
    documentType?: CustomerDocumentType;
    documentNumber?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  order: {
    id: string;
    date: string;
    items: Array<{
      id: string;
      productId: string;
      sku?: string;
      name: string;
      quantity: number;
      unitType: UnitType;
      unitPrice: number;
      netTotal: number;
      discountAmount: number;
      total: number;
    }>;
    payments: Array<{
      id?: string;
      method: PaymentMethod;
      amount: number;
      operationCode?: string;
      walletName?: string;
      receivedAmount?: number;
      change?: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
  };
  paper: {
    widthMm: 80;
    columns: 48;
  };
  fallbackPdfUrl: string;
};
