import type { PrintJobStatus } from "@/printing/jobs/types";

export type KitchenStatus = "ACTIVE" | "INACTIVE";

export type Kitchen = {
  id: string;
  name: string;
  status: KitchenStatus;
  printerId: string | null;
  printer: { id: string; localName: string; status: KitchenStatus } | null;
};

export type KitchenOption = Pick<Kitchen, "id" | "name">;

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
