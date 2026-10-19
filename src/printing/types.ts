import type { CustomerDocumentType } from "@/customer/types";
import type { DocumentStatus, DocumentType } from "@/document/types";
import type { PaymentMethod } from "@/order/types";
import type { KG_UNIT_TYPE, UNIT_UNIT_TYPE } from "@/product/types";

type UnitType = typeof KG_UNIT_TYPE | typeof UNIT_UNIT_TYPE;

export type PrintMode = "gateway" | "pdf";

export type PrintResult =
  | { success: true; mode: "gateway"; message?: string }
  | { success: true; mode: "pdf"; message: string }
  | { success: false; message: string };

export type PrintAlignment = "left" | "center" | "right";

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
      productId?: string; // ausente en la línea de envío
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
};
