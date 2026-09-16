import type { PreparationStation } from "@/product/types";
import type { OrderItemKitchenStatus } from "@/table/types";

export type KitchenItem = {
  id: string;
  paid?: boolean;
  preparationStation: PreparationStation | null;
  productName: string;
  quantity: number;
  notes?: string | null;
  round: number;
  tableLabel: string;
  status: OrderItemKitchenStatus;
  cancellationReason?: string | null;
  kitchenReadyAt?: Date | null;
  createdAt: Date;
};

export type KitchenStatus = "ACTIVE" | "INACTIVE";

export type Kitchen = {
  id: string;
  name: string;
  status: KitchenStatus;
  printerId: string | null;
  printer: { id: string; localName: string; status: KitchenStatus } | null;
};

export type KitchenOption = Pick<Kitchen, "id" | "name">;

export type PrintJobStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

export type PrintJob = {
  id: string;
  companyId: string;
  kitchenTicketId: string;
  printerId: string;
  printClientId: string;
  printerLocalName: string;
  content: Uint8Array;
  status: PrintJobStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  claimRequestedAt: Date | null;
  processingStartedAt: Date | null;
};

export type PrintRecoveryPolicy = {
  timeoutMs: number;
  maxAttempts: number;
  retryDelaysMs: number[];
};

export type PrintAttempt = {
  jobId: string;
  attemptNumber: number;
  printerId: string;
  printerLocalName: string;
  content: Uint8Array;
  timeoutMs: number;
  attemptExpiresAt: Date;
  serverNow: Date;
};

export type PrintResult = "DELIVERED" | "RETRYABLE_FAILURE" | "FAILED";

export type KitchenTicketView = {
  id: string;
  order: {
    id: string;
    type: "DINE_IN" | "TAKE_AWAY" | "DELIVERY";
    label: string;
  };
  kitchen: { id: string; name: string };
  round: { number: number; responsibleUserId: string };
  createdAt: Date;
  attentionReason: "NO_PRINTER_CONFIGURED" | "NOT_PRINTED" | "FAILED" | null;
  lastJob: {
    id: string;
    status: PrintJobStatus;
    isReprint: boolean;
    createdAt: Date;
  } | null;
  activeJob: { id: string; status: "PENDING" | "PROCESSING" } | null;
  canPrint: boolean;
  canReprint: boolean;
};

export type KitchenPrinterAttention = {
  id: string;
  name: string;
  printClientId: string;
  reason: "MISSING_FROM_INVENTORY" | "STALE_ACTIVITY";
};

export type ManualPrintJob = {
  id: string;
  kitchenTicketId: string;
  printClientId: string;
  status: PrintJobStatus;
  isReprint: boolean;
};
